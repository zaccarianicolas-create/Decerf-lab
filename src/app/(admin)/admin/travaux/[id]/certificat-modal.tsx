"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Printer,
  Download,
  Send,
  Save,
  FileCheck,
  Building2,
} from "lucide-react";

type CertificatModalProps = {
  commande: any;
  certificat: any | null;
  onClose: () => void;
};

export function CertificatModal({
  commande,
  certificat: initialCert,
  onClose,
}: CertificatModalProps) {
  const supabase = createClient();
  const printRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [cert, setCert] = useState(initialCert);
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);

  const dentiste = commande.dentiste;
  const patient = commande.patient;
  const items = commande.items || [];

  // Build initial form data from existing cert or commande data
  const [form, setForm] = useState({
    labo_nom: cert?.labo_nom || "DECERF LAB",
    labo_adresse: cert?.labo_adresse || "",
    labo_responsable: cert?.labo_responsable || "",
    labo_numero_agrement: cert?.labo_numero_agrement || "",
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
        .map((i: any) => {
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
        .map((i: any) => i.materiau?.replace(/_/g, " "))
        .filter(Boolean)
        .join(", "),
    dents:
      cert?.dents ||
      items.flatMap((i: any) => i.dents || []).join(", "),
    lot_materiaux: cert?.lot_materiaux || "",
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

  const generateOrUpdate = async () => {
    setSaving(true);

    if (cert) {
      // Update existing
      const { error } = await supabase
        .from("certificats_conformite")
        .update({
          ...form,
        })
        .eq("id", cert.id);

      if (!error) {
        setCert({ ...cert, ...form });
      }
    } else {
      // Generate new via API
      const res = await fetch("/api/admin/certificat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commande_id: commande.id,
          ...form,
        }),
      });
      const data = await res.json();
      if (data.id) {
        // Fetch the created certificat
        const { data: created } = await supabase
          .from("certificats_conformite")
          .select("*")
          .eq("id", data.id)
          .single();
        if (created) {
          // Update with any form edits
          await supabase
            .from("certificats_conformite")
            .update(form)
            .eq("id", created.id);
          setCert({ ...created, ...form });
        } else if (!data.exists) {
          setCert(data);
        }
      }
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

  const handleSendToPraticien = async () => {
    if (!cert) return;
    setSaving(true);
    await supabase
      .from("certificats_conformite")
      .update({
        envoye_au_praticien: true,
        date_envoi: new Date().toISOString(),
      })
      .eq("id", cert.id);
    setCert({ ...cert, envoye_au_praticien: true, date_envoi: new Date().toISOString() });
    setSent(true);
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
          </div>
          <div className="flex items-center gap-2">
            {cert && (
              <>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Imprimer
                </Button>
                <Button
                  onClick={handlePrint}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exporter
                </Button>
                <Button
                  onClick={handleSendToPraticien}
                  disabled={saving || cert.envoye_au_praticien}
                  size="sm"
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  <Send className="h-4 w-4" />
                  {cert.envoye_au_praticien || sent
                    ? "Envoyé ✓"
                    : "Envoyer au praticien"}
                </Button>
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

            <Button
              onClick={generateOrUpdate}
              disabled={saving}
              className="w-full gap-2 bg-sky-600 hover:bg-sky-700"
            >
              <Save className="h-4 w-4" />
              {saving
                ? "Enregistrement..."
                : cert
                  ? "Mettre à jour le certificat"
                  : "Générer le certificat"}
            </Button>
          </div>

          {/* Right: Preview */}
          <div className="max-h-[70vh] overflow-y-auto bg-gray-50 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Aperçu du document
            </h3>

            <div
              ref={printRef}
              className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
              style={{ fontFamily: "Georgia, serif" }}
            >
              {/* Header */}
              <div className="header mb-6 border-b-4 border-double border-gray-800 pb-4 text-center">
                <h1 className="text-xl font-bold tracking-widest text-gray-900">
                  CERTIFICAT DE CONFORMITÉ
                </h1>
                <h2 className="mt-1 text-sm text-gray-600">
                  Dispositif médical sur mesure
                </h2>
                <p className="subtitle mt-1 text-xs text-gray-400">
                  {form.normes_appliquees}
                </p>
              </div>

              {/* Labo */}
              <div className="section mb-5">
                <p className="section-title mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Laboratoire
                </p>
                <p className="text-sm font-semibold">{form.labo_nom}</p>
                {form.labo_adresse && (
                  <p className="text-sm text-gray-600">{form.labo_adresse}</p>
                )}
                {form.labo_responsable && (
                  <p className="text-sm text-gray-600">
                    Responsable : {form.labo_responsable}
                  </p>
                )}
                {form.labo_numero_agrement && (
                  <p className="text-sm text-gray-600">
                    N° agrément : {form.labo_numero_agrement}
                  </p>
                )}
              </div>

              {/* Praticien */}
              <div className="section mb-5">
                <p className="section-title mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Praticien prescripteur
                </p>
                <p className="text-sm font-semibold">{form.dentiste_nom}</p>
                {form.dentiste_inami && (
                  <p className="text-sm text-gray-600">
                    N° INAMI/RIZIV : {form.dentiste_inami}
                  </p>
                )}
              </div>

              {/* Patient */}
              <div className="section mb-5">
                <p className="section-title mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Patient
                </p>
                <p className="text-sm">
                  Référence : {form.patient_reference || "—"}
                </p>
              </div>

              {/* Dispositif */}
              <div className="section mb-5">
                <p className="section-title mb-2 border-b border-gray-300 pb-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                  Description du dispositif
                </p>
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700">
                  {form.description_travail}
                </pre>
                {form.dents && (
                  <p className="mt-1 text-sm">
                    <strong>Dents :</strong> {form.dents}
                  </p>
                )}
                {form.materiaux_utilises && (
                  <p className="text-sm">
                    <strong>Matériaux :</strong> {form.materiaux_utilises}
                  </p>
                )}
                {form.lot_materiaux && (
                  <p className="text-sm">
                    <strong>Traçabilité lot :</strong> {form.lot_materiaux}
                  </p>
                )}
              </div>

              {/* Déclaration */}
              <div className="declaration my-6 border-l-4 border-gray-800 bg-gray-50 p-4 italic">
                <p className="text-sm leading-relaxed text-gray-700">
                  {form.declaration_conformite}
                </p>
              </div>

              {/* Signature */}
              <div className="footer mt-8 flex items-end justify-between">
                <div className="text-sm">
                  <p>
                    Date :{" "}
                    {new Date(form.date_emission).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="signature text-right text-sm">
                  <p className="mb-8">Signature :</p>
                  <p className="border-t border-gray-400 pt-1">
                    {form.signe_par || "________________"}
                  </p>
                </div>
              </div>

              {/* Numéro en bas */}
              {cert?.numero_certificat && (
                <div className="numero mt-8 border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
                  {cert.numero_certificat} — {form.labo_nom}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
