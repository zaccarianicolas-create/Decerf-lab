"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CERTIFICAT_TEMPLATE_TAGS, renderCertificateTemplate, validateCertificateTemplate } from "@/lib/certificat-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, FilePlus2, FileText, Loader2, Save } from "lucide-react";

type CertificateTemplate = {
  id: string;
  code: string;
  nom: string;
  description: string | null;
  contenu_template: string;
  version: number;
  est_defaut: boolean;
  actif: boolean;
};

const emptyTemplate = {
  id: "",
  code: "",
  nom: "",
  description: "",
  contenu_template: "DÉCLARATION DE CONFORMITÉ — DISPOSITIF SUR MESURE\n\nFabricant : {{labo.nom}}\nAdresse du fabricant : {{labo.adresse}}\nSite de fabrication : {{labo.site_fabrication}}\n\nDispositif :\n{{dispositifs.liste}}\n\nPatient (nom, acronyme ou code) : {{patient.identifiant}}\nPrescripteur : {{dentiste.nom}}\nAdresse du prescripteur : {{dentiste.adresse}}\nCaractéristiques prescrites : {{prescription.caracteristiques}}\n\nMatériaux et lots :\n{{production.materiaux_lots}}\n\nDéclaration du fabricant :\n{{conformite.declaration}}\n\nExigences non satisfaites : {{conformite.exigences_non_satisfaites}}\nJustification : {{conformite.justification}}\n\nFait le {{document.date_emission}}\nSignataire : {{document.signataire}}\nN° {{document.numero}}",
  version: 1,
  est_defaut: false,
  actif: true,
};

const DEMO_CERTIFICATE_VALUES: Record<string, string> = {
  "labo.nom": "Laboratoire Exemple",
  "labo.adresse": "1 rue de Démonstration, 0000 Ville Exemple",
  "labo.site_fabrication": "Site de fabrication — exemple",
  "dispositifs.liste": "Couronne unitaire — exemple fictif",
  "patient.identifiant": "PATIENT-DEMO-001",
  "dentiste.nom": "Dr Exemple",
  "dentiste.cabinet": "Cabinet Démo",
  "dentiste.adresse": "2 avenue de Démonstration, 0000 Ville Exemple",
  "prescription.caracteristiques": "Caractéristiques fictives de démonstration",
  "production.materiaux_lots": "Matériau démo — lot DEMO-000",
  "conformite.declaration": "Texte de démonstration — à remplacer par la déclaration validée",
  "conformite.exigences_non_satisfaites": "Aucune — exemple",
  "conformite.justification": "Sans objet — exemple",
  "conformite.classe_dispositif": "Classe exemple",
  "conformite.code_nomenclature": "CODE-DEMO",
  "document.date_emission": "25/10/2026",
  "document.signataire": "Responsable — exemple",
  "document.numero": "APERÇU-DEMO-0000",
};

export function CertificatModelesManager({ initialTemplates }: { initialTemplates: CertificateTemplate[] }) {
  const supabase = createClient();
  const [templates, setTemplates] = useState<CertificateTemplate[]>(initialTemplates);
  const [selected, setSelected] = useState<CertificateTemplate | typeof emptyTemplate>(emptyTemplate);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState("Préparation de l’aperçu…");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [pdfRenderError, setPdfRenderError] = useState<string | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const pdfPagesRef = useRef<HTMLDivElement>(null);
  const demoContent = renderCertificateTemplate(selected.contenu_template, DEMO_CERTIFICATE_VALUES);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setPreviewStatus("Génération du PDF…");
      setPreviewError(null);
      try {
        const response = await fetch("/api/admin/certificats/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contenu: demoContent,
            numero: DEMO_CERTIFICATE_VALUES["document.numero"],
            demo: true,
          }),
          signal: controller.signal,
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || "Aperçu PDF indisponible.");
        }
        const nextUrl = URL.createObjectURL(await response.blob());
        if (controller.signal.aborted) {
          URL.revokeObjectURL(nextUrl);
          return;
        }
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = nextUrl;
        setPreviewUrl(nextUrl);
        setPreviewStatus("Aperçu à jour");
      } catch (error) {
        if (controller.signal.aborted) return;
        setPreviewStatus("");
        setPreviewError(error instanceof Error ? error.message : "Aperçu PDF indisponible.");
      }
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [demoContent]);

  useEffect(() => () => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
  }, []);

  useEffect(() => {
    const container = pdfPagesRef.current;
    if (!previewUrl || !container) return;

    let cancelled = false;
    let cancelLoading: (() => void) | null = null;
    container.replaceChildren();
    setPdfRenderError(null);

    const renderPdf = async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          "pdfjs-dist/build/pdf.worker.min.mjs",
          import.meta.url
        ).toString();
        const response = await fetch(previewUrl);
        if (!response.ok) throw new Error("Impossible de lire le PDF de démonstration.");
        const data = new Uint8Array(await response.arrayBuffer());
        const loadingTask = pdfjs.getDocument({ data });
        cancelLoading = () => { void loadingTask.destroy(); };
        const pdf = await loadingTask.promise;

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
          if (cancelled || !pdfPagesRef.current) return;
          const page = await pdf.getPage(pageNumber);
          const baseViewport = page.getViewport({ scale: 1 });
          const scale = Math.min(1.4, (container.clientWidth || 700) / baseViewport.width);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          if (!context) throw new Error("Le navigateur ne peut pas afficher le PDF.");

          const pixelRatio = window.devicePixelRatio || 1;
          canvas.width = Math.ceil(viewport.width * pixelRatio);
          canvas.height = Math.ceil(viewport.height * pixelRatio);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.maxWidth = "100%";
          canvas.style.height = "auto";
          canvas.className = "mx-auto mb-4 block bg-white shadow-sm";
          pdfPagesRef.current.appendChild(canvas);

          await page.render({
            canvas,
            canvasContext: context,
            viewport,
            transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          }).promise;
        }
      } catch (error) {
        if (!cancelled) {
          setPdfRenderError(error instanceof Error ? error.message : "Erreur d’affichage du PDF.");
        }
      }
    };

    void renderPdf();
    return () => {
      cancelled = true;
      cancelLoading?.();
    };
  }, [previewUrl]);

  const loadTemplates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("certificat_modeles")
      .select("id, code, nom, description, contenu_template, version, est_defaut, actif")
      .order("created_at", { ascending: false });
    if (error) setNotice(error.message);
    else setTemplates((data ?? []) as CertificateTemplate[]);
    setLoading(false);
  };

  const saveTemplate = async () => {
    setErrors(validateCertificateTemplate(selected.contenu_template));
    setNotice("");
    if (validateCertificateTemplate(selected.contenu_template).length) return;
    if (!selected.nom.trim()) {
      setErrors(["Le nom du modèle est obligatoire."]);
      return;
    }
    const code = selected.code.trim() || selected.nom.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setSaving(true);

    if (selected.est_defaut) {
      const { error: defaultError } = await supabase
        .from("certificat_modeles")
        .update({ est_defaut: false })
        .neq("id", selected.id || "00000000-0000-0000-0000-000000000000");
      if (defaultError) {
        setNotice(defaultError.message);
        setSaving(false);
        return;
      }
    }

    const payload = {
      code,
      nom: selected.nom.trim(),
      description: selected.description || null,
      contenu_template: selected.contenu_template,
      version: selected.id ? selected.version + 1 : 1,
      est_defaut: selected.est_defaut,
      actif: selected.actif,
    };
    const result = selected.id
      ? await supabase.from("certificat_modeles").update(payload).eq("id", selected.id)
      : await supabase.from("certificat_modeles").insert(payload);
    if (result.error) {
      setNotice(result.error.message);
    } else {
      setNotice("Modèle enregistré.");
      setSelected(emptyTemplate);
      await loadTemplates();
    }
    setSaving(false);
  };

  const toggleActive = async (template: CertificateTemplate) => {
    const { error } = await supabase
      .from("certificat_modeles")
      .update({ actif: !template.actif })
      .eq("id", template.id);
    if (error) setNotice(error.message);
    else await loadTemplates();
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <p className="text-sm font-medium text-blue-700">Conformité · MDR</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">Modèles de fiche</h1>
        </div>
        <Button onClick={() => { setSelected(emptyTemplate); setErrors([]); }} variant="outline" className="gap-2">
          <FilePlus2 className="h-4 w-4" /> Nouveau modèle
        </Button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="space-y-3" aria-label="Modèles existants">
          <h2 className="text-sm font-semibold text-gray-800">Modèles enregistrés</h2>
          {loading ? <p className="text-sm text-gray-500">Chargement…</p> : templates.map((template) => (
            <article key={template.id} className="flex items-center justify-between gap-3 border-b border-gray-200 py-3">
              <button className="min-w-0 text-left" onClick={() => { setSelected(template); setErrors([]); }}>
                <span className="block truncate text-sm font-medium text-gray-900">{template.nom}</span>
                <span className="mt-1 block text-xs text-gray-500">v{template.version}{template.est_defaut ? " · Défaut" : ""}{!template.actif ? " · Inactif" : ""}</span>
              </button>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => void toggleActive(template)}>
                  {template.actif ? "Désactiver" : "Activer"}
                </Button>
                <Button variant="outline" size="icon" aria-label="Modifier le modèle" onClick={() => { setSelected(template); setErrors([]); }}>
                  <Save className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </section>

        <section className="space-y-4 border-t border-gray-200 pt-5 xl:border-l xl:border-t-0 xl:pl-6 xl:pt-0">
          <h2 className="text-sm font-semibold text-gray-800">{selected.id ? `Modifier · v${selected.version}` : "Nouveau modèle"}</h2>
          <Input label="Nom" value={selected.nom} onChange={(event) => setSelected({ ...selected, nom: event.target.value })} />
          <Input label="Code unique" value={selected.code} onChange={(event) => setSelected({ ...selected, code: event.target.value })} placeholder="Généré depuis le nom si vide" />
          <Input label="Description" value={selected.description || ""} onChange={(event) => setSelected({ ...selected, description: event.target.value })} />
          <label className="block space-y-1 text-sm font-medium text-gray-700">
            Contenu du modèle
            <textarea
              value={selected.contenu_template}
              onChange={(event) => setSelected({ ...selected, contenu_template: event.target.value })}
              rows={18}
              className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </label>
          <section className="overflow-hidden rounded-md border border-gray-200 bg-gray-50">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 px-3 py-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-800">Aperçu PDF en direct</h3>
                <p className="text-xs text-amber-700">Données entièrement fictives — document de démonstration, non valable.</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-gray-500" role="status">
                {previewStatus === "Génération du PDF…" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {previewStatus}
              </span>
            </div>
            {previewError ? (
              <p role="alert" className="p-4 text-sm text-red-700">{previewError}</p>
            ) : previewUrl ? (
              <div className="max-h-[70vh] overflow-y-auto p-3">
                {pdfRenderError ? (
                  <p role="alert" className="text-sm text-red-700">{pdfRenderError}</p>
                ) : (
                  <div ref={pdfPagesRef} aria-label="Pages du PDF de démonstration" />
                )}
              </div>
            ) : (
              <div className="flex h-56 items-center justify-center gap-2 text-sm text-gray-500">
                <FileText className="h-4 w-4" />
                Génération du premier aperçu…
              </div>
            )}
          </section>
          <fieldset className="flex flex-wrap gap-5 text-sm text-gray-700">
            <label className="flex items-center gap-2"><input type="checkbox" checked={selected.est_defaut} onChange={(event) => setSelected({ ...selected, est_defaut: event.target.checked })} /> Modèle par défaut</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={selected.actif} onChange={(event) => setSelected({ ...selected, actif: event.target.checked })} /> Actif</label>
          </fieldset>
          <div className="rounded-md bg-gray-50 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase text-gray-600">Balises disponibles</h3>
            <div className="flex flex-wrap gap-x-3 gap-y-2">
              {Object.entries(CERTIFICAT_TEMPLATE_TAGS).map(([tag, label]) => (
                <button key={tag} type="button" title={`Insérer {{${tag}}}`} onClick={() => setSelected({ ...selected, contenu_template: `${selected.contenu_template}{{${tag}}}` })} className="font-mono text-xs text-blue-700 underline decoration-dotted underline-offset-2">
                  {`{{${tag}}}`} <span className="font-sans text-gray-500">{label}</span>
                </button>
              ))}
            </div>
          </div>
          {errors.length > 0 && <ul className="space-y-1 text-sm text-red-700">{errors.map((error) => <li key={error}>{error}</li>)}</ul>}
          {notice && <p role="status" className="text-sm text-gray-700">{notice}</p>}
          <Button onClick={() => void saveTemplate()} disabled={saving} className="gap-2">
            {selected.est_defaut ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saving ? "Enregistrement…" : "Enregistrer le modèle"}
          </Button>
          <p className="text-xs leading-relaxed text-gray-500">Les déclarations doivent être vérifiées et validées par le responsable du laboratoire avant émission. La validation du modèle ne remplace pas cette revue.</p>
        </section>
      </div>
    </div>
  );
}
