"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { renderCertificateTemplate } from "@/lib/certificat-template";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Printer,
  Download,
  Send,
  Save,
  FileCheck,
  FileText,
  Loader2,
} from "lucide-react";

type WorkItem = {
  id: string;
  item_label: string | null;
  type_travail: string;
  description: string | null;
  dents: string[] | null;
  materiau: string | null;
  teinte: string | null;
};

type CertificateRecord = {
  id: string;
  numero_certificat: string;
  statut: string | null;
  labo_nom: string | null;
  labo_adresse: string | null;
  labo_responsable: string | null;
  labo_numero_agrement: string | null;
  labo_site_fabrication: string | null;
  dentiste_nom: string | null;
  dentiste_inami: string | null;
  patient_reference: string | null;
  description_travail: string | null;
  materiaux_utilises: string | null;
  dents: string | null;
  lot_materiaux: string | null;
  classe_dispositif: string | null;
  code_nomenclature: string | null;
  normes_appliquees: string | null;
  declaration_conformite: string | null;
  signe_par: string | null;
  date_emission: string | null;
  date_validation: string | null;
  valide_par: string | null;
  emis_par: string | null;
  envoye_par: string | null;
  envoye_au_praticien: boolean;
  date_envoi: string | null;
  pdf_storage_bucket: string | null;
  pdf_storage_path: string | null;
  modele_id: string | null;
  donnees_snapshot: Record<string, unknown> | null;
};

type CertificatModalProps = {
  commande: {
    id: string;
    patient_ref: string | null;
    patient?: { reference: string | null } | null;
    dentiste?: {
      prenom: string;
      nom: string;
      numero_inami: string | null;
      cabinet?: {
        nom: string;
        adresse: string | null;
        code_postal: string | null;
        ville: string | null;
      } | {
        nom: string;
        adresse: string | null;
        code_postal: string | null;
        ville: string | null;
      }[] | null;
    } | null;
    items: WorkItem[];
  };
  commandeItemId: string;
  certificatModeles: { id: string; nom: string; version: number; est_defaut: boolean; contenu_template: string }[];
  certificat: CertificateRecord | null;
  currentUserId: string;
  onClose: () => void;
};

export function CertificatModal({
  commande,
  commandeItemId,
  certificatModeles,
  certificat: initialCert,
  currentUserId,
  onClose,
}: CertificatModalProps) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const pdfPreviewUrlRef = useRef<string | null>(null);
  const [cert, setCert] = useState(initialCert);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [generatingPdfPreview, setGeneratingPdfPreview] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [confirmCustomMade, setConfirmCustomMade] = useState(Boolean(initialCert));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [modeleId, setModeleId] = useState<string>(
    initialCert?.modele_id || certificatModeles.find((model) => model.est_defaut)?.id || ""
  );

  const dentiste = commande.dentiste;
  const cabinet = Array.isArray(dentiste?.cabinet) ? dentiste.cabinet[0] : dentiste?.cabinet;
  const dentisteAdresse = [cabinet?.nom, cabinet?.adresse, cabinet?.code_postal, cabinet?.ville].filter(Boolean).join(", ");
  const patient = commande.patient;
  const items = commande.items || [];

  // Build initial form data from existing cert or commande data
  const [form, setForm] = useState({
    labo_nom: cert?.labo_nom || "DECERF LAB",
    labo_adresse: cert?.labo_adresse || "",
    labo_responsable: cert?.labo_responsable || "",
    labo_numero_agrement: cert?.labo_numero_agrement || "",
    labo_site_fabrication: cert?.labo_site_fabrication || "",
    dentiste_nom:
      cert?.dentiste_nom ||
      (dentiste ? `Dr ${dentiste.prenom} ${dentiste.nom}` : ""),
    dentiste_inami: cert?.dentiste_inami || dentiste?.numero_inami || "",
    patient_reference:
      cert?.patient_reference ||
      patient?.reference ||
      commande.patient_ref ||
      "",
    description_travail:
      cert?.description_travail ||
      items
        .map((i) => {
          const parts = [i.type_travail?.replace(/_/g, " ")];
          if (i.dents?.length) parts.push(`dents: ${i.dents.join(", ")}`);
          if (i.materiau) parts.push(i.materiau.replace(/_/g, " "));
          if (i.teinte) parts.push(`teinte ${i.teinte}`);
          return parts.join(" — ");
        })
        .join("\n"),
    materiaux_utilises:
      cert?.materiaux_utilises ||
      items
        .map((i) => i.materiau?.replace(/_/g, " "))
        .filter(Boolean)
        .join(", "),
    dents:
      cert?.dents ||
      items.flatMap((i) => i.dents || []).join(", "),
    lot_materiaux: cert?.lot_materiaux || "",
    classe_dispositif: cert?.classe_dispositif || "",
    code_nomenclature: cert?.code_nomenclature || "",
    exigences_non_satisfaites: String(cert?.donnees_snapshot?.exigences_non_satisfaites || ""),
    justification: String(cert?.donnees_snapshot?.justification || ""),
    normes_appliquees:
      cert?.normes_appliquees ||
      "Règlement (UE) 2017/745 relatif aux dispositifs médicaux - AR du 18/03/1999",
    declaration_conformite:
      cert?.declaration_conformite ||
      "Le soussigné déclare que le dispositif médical sur mesure décrit ci-dessus est conforme aux exigences générales en matière de sécurité et de performances de l'Annexe I du Règlement (UE) 2017/745 et aux dispositions de l'Arrêté Royal du 18 mars 1999. Ce dispositif a été fabriqué exclusivement pour le patient identifié ci-dessus, sur prescription du praticien mentionné.",
    signe_par: cert?.signe_par || "",
    date_emission:
      cert?.date_emission || new Date().toISOString().split("T")[0],
  });

  const certStatut = cert?.statut || "brouillon";
  const statutLabel: Record<string, string> = {
    brouillon: "Brouillon",
    valide: "Validé",
    emis: "Émis",
    envoye: "Envoyé",
  };
  const selectedModel = certificatModeles.find((model) => model.id === modeleId);
  const actualMaterials = Array.isArray(cert?.donnees_snapshot?.materiaux_lots)
    ? cert.donnees_snapshot.materiaux_lots as Record<string, unknown>[]
    : [];
  const previewContent = selectedModel
    ? renderCertificateTemplate(selectedModel.contenu_template, {
        "labo.nom": form.labo_nom,
        "labo.adresse": form.labo_adresse,
        "labo.site_fabrication": form.labo_site_fabrication,
        "dispositifs.liste": form.description_travail,
        "patient.identifiant": form.patient_reference,
        "dentiste.nom": form.dentiste_nom,
        "dentiste.cabinet": cabinet?.nom || "",
        "dentiste.adresse": dentisteAdresse,
        "prescription.caracteristiques": form.description_travail,
        "production.materiaux_lots": actualMaterials.map((material) => {
          const parts = [String(material.nom || "Article")];
          if (material.numero_lot) parts.push(`lot ${String(material.numero_lot)}`);
          if (material.quantite) parts.push(`${String(material.quantite)}${material.unite ? ` ${String(material.unite)}` : ""}`);
          return parts.join(" · ");
        }).join("\n") || form.materiaux_utilises || "",
        "conformite.declaration": form.declaration_conformite,
        "conformite.exigences_non_satisfaites": form.exigences_non_satisfaites,
        "conformite.justification": form.justification,
        "conformite.classe_dispositif": form.classe_dispositif,
        "conformite.code_nomenclature": form.code_nomenclature,
        "document.date_emission": new Date(`${form.date_emission}T00:00:00`).toLocaleDateString("fr-BE"),
        "document.signataire": form.signe_par,
        "document.numero": cert?.numero_certificat || "Attribué à la création",
      })
    : "Choisissez un modèle pour afficher l’aperçu.";

    useEffect(() => () => {
      if (pdfPreviewUrlRef.current) URL.revokeObjectURL(pdfPreviewUrlRef.current);
    }, []);

    const generatePdfPreview = async () => {
      if (!selectedModel) return;
      setGeneratingPdfPreview(true);
      setErrorMessage(null);
      try {
        const response = await fetch("/api/admin/certificats/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contenu: previewContent,
            numero: cert?.numero_certificat || "APERÇU - NUMÉRO PROVISOIRE",
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          setErrorMessage(result.error || "Impossible de générer l’aperçu PDF.");
          return;
        }
        const nextUrl = URL.createObjectURL(await response.blob());
        if (pdfPreviewUrlRef.current) URL.revokeObjectURL(pdfPreviewUrlRef.current);
        pdfPreviewUrlRef.current = nextUrl;
        setPdfPreviewUrl(nextUrl);
      } catch {
        setErrorMessage("Erreur réseau pendant la génération de l’aperçu PDF.");
      } finally {
        setGeneratingPdfPreview(false);
      }
    };

  const generateOrUpdate = async () => {
    setSaving(true);
    setErrorMessage(null);

    if (cert) {
      const response = await fetch(`/api/admin/certificats/${cert.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, modele_id: modeleId }),
      });
      const data = await response.json();
      if (response.ok) {
        setCert(data);
      } else {
        setErrorMessage(data.error || "Impossible d’enregistrer cette fiche.");
      }
    } else {
      const res = await fetch("/api/admin/certificats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commande_id: commande.id,
          commande_item_id: commandeItemId,
          dispositif_sur_mesure: confirmCustomMade,
          modele_id: modeleId,
          ...form,
        }),
      });
      const data = await res.json();
      if (res.ok && data.id) {
        setCert(data);
      } else {
        setErrorMessage(data.error || "Impossible de créer cette fiche.");
      }
    }

    setSaving(false);
  };

  const logCertEvent = async (title: string, description?: string) => {
    await supabase.from("commande_workflow_events").insert({
      commande_id: commande.id,
      type: "information",
      titre: title,
      description: description || null,
      visible_praticien: true,
      created_by: currentUserId,
      metadata: { source: "certificat" },
    });
  };

  const transitionCertificat = async (target: "valide" | "emis" | "envoye") => {
    if (!cert) return;
    setSaving(true);
    setErrorMessage(null);
    const currentCert = cert;

    if (target === "emis") {
      const response = await fetch(`/api/admin/certificats/${cert.id}/emettre`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setCert({ ...cert, statut: "emis", pdf_storage_bucket: "certificats", pdf_storage_path: data.path || cert.pdf_storage_path });
        await logCertEvent("Déclaration émise", cert.numero_certificat);
      } else {
        setErrorMessage(data.error || "Impossible d’émettre la fiche.");
      }
      setSaving(false);
      return;
    }

    if (target === "valide") {
      const response = await fetch(`/api/admin/certificats/${cert.id}/valider`, { method: "POST" });
      const data = await response.json();
      if (response.ok) {
        setCert(data);
        await logCertEvent("Déclaration validée", cert.numero_certificat);
      } else {
        setErrorMessage(data.error || "Impossible de valider la fiche.");
      }
      setSaving(false);
      return;
    }

    const now = new Date().toISOString();
    const payload: Record<string, unknown> = {
      statut: target,
      envoye_au_praticien: true,
      date_envoi: now,
      envoye_par: currentUserId,
    };

    const { error } = await supabase
      .from("certificats_conformite")
      .update(payload)
      .eq("id", cert.id);

    if (!error) {
      const updated = { ...currentCert, ...payload };
      setCert(updated);
      if (target === "envoye") {
        setSent(true);
      }

      if (target === "envoye") {
        await logCertEvent("Déclaration mise à disposition du praticien", cert.numero_certificat);
      }
    } else {
      setErrorMessage(error.message);
    }

    setSaving(false);
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificat de Conformité${cert?.numero_certificat ? ` — ${cert.numero_certificat}` : ""}</title>
        <style>
          @page { margin: 2cm; }
          body { font-family: 'Georgia', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { font-size: 18pt; margin: 0; letter-spacing: 2px; }
          .header h2 { font-size: 13pt; margin: 5px 0 0; font-weight: normal; color: #555; }
          .header .subtitle { font-size: 10pt; color: #777; margin-top: 3px; }
          .section { margin-bottom: 18px; }
          .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #444; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
          .field { margin-bottom: 4px; }
          .field-label { font-weight: bold; display: inline; }
          .declaration { background: #f8f8f8; padding: 15px; border-left: 3px solid #333; margin: 15px 0; font-style: italic; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { text-align: right; }
          .numero { text-align: center; font-size: 9pt; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const handleDownloadPdf = () => {
    if (cert) window.location.href = `/api/certificats/${cert.id}/pdf`;
  };

  const handleDownloadVasExport = async () => {
    if (!cert) return;
    setSaving(true);
    setErrorMessage(null);
    const response = await fetch(`/api/admin/certificats/${cert.id}/vas-export`, { method: "POST" });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setErrorMessage(data.error || "Impossible de préparer l’export VAS.");
      setSaving(false);
      return;
    }
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `VAS-${cert.numero_certificat}.json`;
    link.click();
    URL.revokeObjectURL(downloadUrl);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-10">
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <FileCheck className="h-5 w-5 text-sky-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Certificat de conformité
              {cert?.numero_certificat && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  {cert.numero_certificat}
                </span>
              )}
            </h2>
            {cert && (
              <Badge
                variant={
                  certStatut === "envoye"
                    ? "success"
                    : certStatut === "emis"
                      ? "info"
                      : certStatut === "valide"
                        ? "warning"
                        : "default"
                }
              >
                {statutLabel[certStatut] || certStatut}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {cert && (
              <>
                {certStatut === "brouillon" && (
                  <Button
                    onClick={() => transitionCertificat("valide")}
                    disabled={saving}
                    variant="outline"
                    size="sm"
                  >
                    Valider
                  </Button>
                )}
                {certStatut === "valide" && (
                  <Button
                    onClick={() => transitionCertificat("emis")}
                    disabled={saving}
                    variant="outline"
                    size="sm"
                  >
                    Émettre
                  </Button>
                )}
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                {cert.pdf_storage_path && (
                  <Button onClick={handleDownloadPdf} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" /> Télécharger le PDF
                  </Button>
                )}
                {["emis", "envoye"].includes(certStatut) && (
                  <Button onClick={handleDownloadVasExport} disabled={saving} variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" /> Export VAS
                  </Button>
                )}
                {certStatut === "emis" && (
                  <Button
                    onClick={() => transitionCertificat("envoye")}
                    disabled={saving || sent}
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700"
                  >
                    <Send className="h-4 w-4" />
                    {sent ? "Mis à disposition ✓" : "Mettre à disposition"}
                  </Button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              className="ml-2 rounded-lg p-2 text-gray-400 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs: Formulaire / Aperçu */}
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Left: Form */}
          <div className="max-h-[70vh] space-y-4 overflow-y-auto border-r border-gray-100 p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
              Données du certificat
            </h3>
            <label className="block space-y-1 text-sm font-medium text-gray-700">
              Modèle de déclaration
              <select
                value={modeleId}
                onChange={(event) => setModeleId(event.target.value)}
                disabled={Boolean(cert && certStatut !== "brouillon")}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Choisir un modèle</option>
                {certificatModeles.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.nom} · v{model.version}{model.est_defaut ? " · défaut" : ""}
                  </option>
                ))}
              </select>
            </label>
            <fieldset disabled={Boolean(cert && certStatut !== "brouillon")} className="min-w-0 space-y-4 border-0 p-0">

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Laboratoire
              </p>
              <div className="space-y-2">
                <Input
                  label="Nom du laboratoire"
                  value={form.labo_nom}
                  onChange={(e) =>
                    setForm({ ...form, labo_nom: e.target.value })
                  }
                />
                <Input
                  label="Adresse"
                  value={form.labo_adresse}
                  onChange={(e) =>
                    setForm({ ...form, labo_adresse: e.target.value })
                  }
                />
                <Input
                  label="Site de fabrication"
                  value={form.labo_site_fabrication}
                  onChange={(e) => setForm({ ...form, labo_site_fabrication: e.target.value })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Responsable"
                    value={form.labo_responsable}
                    onChange={(e) =>
                      setForm({ ...form, labo_responsable: e.target.value })
                    }
                  />
                  <Input
                    label="N° agrément"
                    value={form.labo_numero_agrement}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        labo_numero_agrement: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Praticien
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="Nom du praticien"
                  value={form.dentiste_nom}
                  onChange={(e) =>
                    setForm({ ...form, dentiste_nom: e.target.value })
                  }
                />
                <Input
                  label="N° INAMI/RIZIV"
                  value={form.dentiste_inami}
                  onChange={(e) =>
                    setForm({ ...form, dentiste_inami: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Dispositif médical
              </p>
              <div className="space-y-2">
                <Input
                  label="Référence patient"
                  value={form.patient_reference}
                  onChange={(e) =>
                    setForm({ ...form, patient_reference: e.target.value })
                  }
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Description du travail
                  </label>
                  <textarea
                    value={form.description_travail}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        description_travail: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="Matériaux utilisés"
                    value={form.materiaux_utilises}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        materiaux_utilises: e.target.value,
                      })
                    }
                  />
                  <Input
                    label="Dents"
                    value={form.dents}
                    onChange={(e) =>
                      setForm({ ...form, dents: e.target.value })
                    }
                  />
                </div>
                <Input
                  label="N° lot matériaux (traçabilité)"
                  value={form.lot_materiaux}
                  onChange={(e) =>
                    setForm({ ...form, lot_materiaux: e.target.value })
                  }
                  placeholder="Ex: LOT-2026-ZRC-001"
                />
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 text-sm font-medium text-gray-700">
                    Classe du dispositif
                    <select
                      value={form.classe_dispositif}
                      onChange={(e) => setForm({ ...form, classe_dispositif: e.target.value })}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">À déterminer</option>
                      <option value="I">I</option>
                      <option value="IIa">IIa</option>
                      <option value="IIb">IIb</option>
                      <option value="III">III</option>
                    </select>
                  </label>
                  <Input
                    label="Code de nomenclature"
                    value={form.code_nomenclature}
                    onChange={(e) => setForm({ ...form, code_nomenclature: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase text-gray-500">
                Conformité
              </p>
              <div className="space-y-2">
                <Input
                  label="Normes appliquées"
                  value={form.normes_appliquees}
                  onChange={(e) =>
                    setForm({ ...form, normes_appliquees: e.target.value })
                  }
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Déclaration de conformité
                  </label>
                  <textarea
                    value={form.declaration_conformite}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        declaration_conformite: e.target.value,
                      })
                    }
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Exigences non satisfaites (ou indiquer « Aucune »)
                  </label>
                  <textarea
                    value={form.exigences_non_satisfaites}
                    onChange={(e) => setForm({ ...form, exigences_non_satisfaites: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Justification si des exigences ne sont pas satisfaites
                  </label>
                  <textarea
                    value={form.justification}
                    onChange={(e) => setForm({ ...form, justification: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Signé par"
                value={form.signe_par}
                onChange={(e) =>
                  setForm({ ...form, signe_par: e.target.value })
                }
                placeholder="Nom du signataire"
              />
              <Input
                label="Date d'émission"
                type="date"
                value={form.date_emission}
                onChange={(e) =>
                  setForm({ ...form, date_emission: e.target.value })
                }
              />
            </div>
            </fieldset>

            {(!cert || certStatut === "brouillon") && (
              <Button
                onClick={generateOrUpdate}
                disabled={saving || !modeleId || (!cert && !confirmCustomMade)}
                className="w-full gap-2 bg-sky-600 hover:bg-sky-700"
              >
                <Save className="h-4 w-4" />
                {saving ? "Enregistrement..." : cert ? "Mettre à jour le brouillon" : "Générer le brouillon"}
              </Button>
            )}
            {!cert && (
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={confirmCustomMade}
                  onChange={(event) => setConfirmCustomMade(event.target.checked)}
                  className="mt-1"
                />
                <span>Je confirme que cette ligne concerne un dispositif médical sur mesure.</span>
              </label>
            )}
            {errorMessage && (
              <p role="alert" className="text-sm text-red-700">{errorMessage}</p>
            )}
          </div>

          {/* Right: Preview */}
          <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Aperçu PDF final
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void generatePdfPreview()}
                disabled={!selectedModel || generatingPdfPreview}
                className="gap-2"
              >
                {generatingPdfPreview ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {generatingPdfPreview ? "Génération…" : "Générer l’aperçu PDF"}
              </Button>
            </div>
            {pdfPreviewUrl ? (
              <div className="space-y-2">
                {!cert?.numero_certificat && (
                  <p className="text-xs text-amber-700">
                    Numéro provisoire : le numéro définitif sera attribué à la création de la fiche.
                  </p>
                )}
                <iframe
                  key={pdfPreviewUrl}
                  src={pdfPreviewUrl}
                  title="Aperçu du PDF de conformité"
                  className="h-[70vh] w-full rounded-lg border border-gray-200 bg-white"
                />
              </div>
            ) : (
              <div
                ref={printRef}
                className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
                style={{ fontFamily: "Georgia, serif" }}
              >
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                  {previewContent}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
