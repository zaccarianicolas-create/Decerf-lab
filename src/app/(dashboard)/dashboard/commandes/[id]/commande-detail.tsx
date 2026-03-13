"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Briefcase,
  FileCheck,
  Printer,
  Download,
  Monitor,
  Truck,
  Calendar,
  MapPin,
  Clock,
} from "lucide-react";

const STATUT_STEPS = [
  { key: "en_attente", label: "Reçu" },
  { key: "acceptee", label: "Accepté" },
  { key: "en_cours", label: "Fabrication" },
  { key: "controle_qualite", label: "Contrôle" },
  { key: "terminee", label: "Terminé" },
  { key: "expediee", label: "Expédié" },
  { key: "livree", label: "Livré" },
];

const STATUT_ORDER: Record<string, number> = {
  en_attente: 0,
  acceptee: 1,
  en_cours: 2,
  controle_qualite: 3,
  terminee: 4,
  expediee: 5,
  livree: 6,
  annulee: -1,
};

export function CommandeDetail({ commande }: { commande: any }) {
  const patient = commande.patient;
  const items = commande.items || [];
  const fichiers = commande.fichiers || [];
  const certificat = commande.certificat;
  const currentStep = STATUT_ORDER[commande.statut] ?? 0;

  const handlePrintCertificat = () => {
    if (!certificat) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificat de Conformité — ${certificat.numero_certificat}</title>
        <style>
          @page { margin: 2cm; }
          body { font-family: 'Georgia', serif; font-size: 12pt; line-height: 1.6; color: #1a1a1a; }
          .header { text-align: center; border-bottom: 3px double #333; padding-bottom: 15px; margin-bottom: 25px; }
          .header h1 { font-size: 18pt; margin: 0; letter-spacing: 2px; }
          .header h2 { font-size: 13pt; margin: 5px 0 0; font-weight: normal; color: #555; }
          .section { margin-bottom: 18px; }
          .section-title { font-size: 11pt; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #444; border-bottom: 1px solid #ccc; padding-bottom: 3px; margin-bottom: 8px; }
          .declaration { background: #f8f8f8; padding: 15px; border-left: 3px solid #333; margin: 15px 0; font-style: italic; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; }
          .signature { text-align: right; }
          .numero { text-align: center; font-size: 9pt; color: #999; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CERTIFICAT DE CONFORMITÉ</h1>
          <h2>Dispositif médical sur mesure</h2>
          <p style="font-size:10pt;color:#777">${certificat.normes_appliquees}</p>
        </div>
        <div class="section">
          <p class="section-title">Laboratoire</p>
          <p><strong>${certificat.labo_nom}</strong></p>
          ${certificat.labo_adresse ? `<p>${certificat.labo_adresse}</p>` : ""}
          ${certificat.labo_responsable ? `<p>Responsable : ${certificat.labo_responsable}</p>` : ""}
          ${certificat.labo_numero_agrement ? `<p>N° agrément : ${certificat.labo_numero_agrement}</p>` : ""}
        </div>
        <div class="section">
          <p class="section-title">Praticien prescripteur</p>
          <p><strong>${certificat.dentiste_nom || "—"}</strong></p>
          ${certificat.dentiste_inami ? `<p>N° INAMI/RIZIV : ${certificat.dentiste_inami}</p>` : ""}
        </div>
        <div class="section">
          <p class="section-title">Patient</p>
          <p>Référence : ${certificat.patient_reference || "—"}</p>
        </div>
        <div class="section">
          <p class="section-title">Description du dispositif</p>
          <p>${certificat.description_travail}</p>
          ${certificat.dents ? `<p><strong>Dents :</strong> ${certificat.dents}</p>` : ""}
          ${certificat.materiaux_utilises ? `<p><strong>Matériaux :</strong> ${certificat.materiaux_utilises}</p>` : ""}
          ${certificat.lot_materiaux ? `<p><strong>Traçabilité lot :</strong> ${certificat.lot_materiaux}</p>` : ""}
        </div>
        <div class="declaration">
          <p>${certificat.declaration_conformite}</p>
        </div>
        <div class="footer">
          <div><p>Date : ${new Date(certificat.date_emission).toLocaleDateString("fr-FR")}</p></div>
          <div class="signature">
            <p style="margin-bottom:40px">Signature :</p>
            <p style="border-top:1px solid #999;padding-top:5px">${certificat.signe_par || "________________"}</p>
          </div>
        </div>
        <div class="numero">${certificat.numero_certificat} — ${certificat.labo_nom}</div>
      </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/commandes"
          className="rounded-lg border border-gray-200 p-2 hover:bg-gray-50"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            Commande {commande.numero}
          </h1>
          <p className="text-sm text-gray-500">
            Suivi de votre travail en laboratoire
          </p>
        </div>
        {commande.priorite !== "normale" && (
          <Badge variant="danger">{commande.priorite}</Badge>
        )}
      </div>

      {/* Timeline */}
      {commande.statut !== "annulee" ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STATUT_STEPS.map((step, i) => {
                const done = i <= currentStep;
                const active = i === currentStep;
                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          active
                            ? "bg-sky-600 text-white ring-4 ring-sky-100"
                            : done
                              ? "bg-sky-600 text-white"
                              : "bg-gray-200 text-gray-400"
                        }`}
                      >
                        {i + 1}
                      </div>
                      <span
                        className={`mt-1.5 text-xs ${
                          active
                            ? "font-semibold text-sky-600"
                            : done
                              ? "text-gray-700"
                              : "text-gray-400"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {i < STATUT_STEPS.length - 1 && (
                      <div
                        className={`mx-1 h-0.5 flex-1 ${
                          i < currentStep ? "bg-sky-600" : "bg-gray-200"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
          Cette commande a été annulée
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Travaux */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-4 flex items-center gap-2 font-semibold text-gray-900">
                <Briefcase className="h-4 w-4 text-sky-600" />
                Travaux demandés
              </h2>
              <div className="space-y-3">
                {items.map((item: any) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-gray-200 p-4"
                  >
                    <p className="font-medium capitalize text-gray-900">
                      {item.type_travail?.replace(/_/g, " ")}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
                      {item.dents?.length > 0 && (
                        <span>Dents: {item.dents.join(", ")}</span>
                      )}
                      {item.materiau && (
                        <span>• {item.materiau.replace(/_/g, " ")}</span>
                      )}
                      {item.teinte && <span>• Teinte {item.teinte}</span>}
                    </div>
                    {item.notes && (
                      <p className="mt-2 text-sm text-gray-600">{item.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Fichiers */}
          {fichiers.length > 0 && (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 font-semibold text-gray-900">
                  Fichiers joints
                </h2>
                <div className="space-y-2">
                  {fichiers.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <span className="text-sm">
                        {f.nom_original}
                      </span>
                      <span className="text-xs text-gray-400">
                        {f.taille
                          ? `${(f.taille / 1024 / 1024).toFixed(2)} MB`
                          : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Certificat */}
          {certificat && (
            <Card className="border-green-200 bg-green-50/30">
              <CardContent className="p-6">
                <h2 className="mb-4 flex items-center gap-2 font-semibold text-green-800">
                  <FileCheck className="h-5 w-5" />
                  Certificat de conformité
                </h2>
                <div className="space-y-2 text-sm text-gray-700">
                  <p>
                    <strong>N° :</strong> {certificat.numero_certificat}
                  </p>
                  <p>
                    <strong>Date :</strong>{" "}
                    {new Date(certificat.date_emission).toLocaleDateString("fr-FR")}
                  </p>
                  <p>
                    <strong>Description :</strong>{" "}
                    {certificat.description_travail}
                  </p>
                  <p>
                    <strong>Normes :</strong> {certificat.normes_appliquees}
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={handlePrintCertificat}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Imprimer
                  </Button>
                  <Button
                    onClick={handlePrintCertificat}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Exporter PDF
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Patient */}
          {patient && (
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-gray-900">
                  <User className="h-4 w-4 text-sky-600" />
                  Patient
                </h2>
                <div className="space-y-2 text-sm">
                  <p className="font-medium">
                    {patient.prenom} {patient.nom}
                  </p>
                  <p className="font-mono text-xs text-sky-600">
                    {patient.reference}
                  </p>
                  {patient.date_naissance && (
                    <p className="text-gray-500">
                      Né(e) le{" "}
                      {new Date(patient.date_naissance).toLocaleDateString("fr-FR")}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Réception */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 font-semibold text-gray-900">Réception</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  {commande.mode_reception === "enlevement" ? (
                    <>
                      <Truck className="h-4 w-4 text-teal-600" />
                      <span>Enlèvement</span>
                    </>
                  ) : (
                    <>
                      <Monitor className="h-4 w-4 text-sky-600" />
                      <span>Envoi numérique</span>
                    </>
                  )}
                </div>
                {commande.adresse_enlevement && (
                  <div className="flex items-start gap-2 text-gray-500">
                    <MapPin className="mt-0.5 h-3.5 w-3.5" />
                    <span>{commande.adresse_enlevement}</span>
                  </div>
                )}
                {commande.date_enlevement && (
                  <div className="flex items-center gap-2 text-gray-500">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      {new Date(commande.date_enlevement).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Details */}
          <Card>
            <CardContent className="p-6">
              <h2 className="mb-3 font-semibold text-gray-900">Détails</h2>
              <div className="space-y-2 text-sm">
                {commande.date_souhaitee && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span>
                      Souhaité le{" "}
                      {new Date(commande.date_souhaitee).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                )}
                {commande.notes_dentiste && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">Vos notes</p>
                    <p className="text-gray-700">{commande.notes_dentiste}</p>
                  </div>
                )}
                {commande.notes_labo && (
                  <div className="mt-2">
                    <p className="text-xs text-gray-400">Notes du laboratoire</p>
                    <p className="text-gray-700">{commande.notes_labo}</p>
                  </div>
                )}
                {commande.montant_total > 0 && (
                  <div className="mt-3 border-t border-gray-100 pt-3">
                    <p className="text-xs text-gray-400">Montant</p>
                    <p className="text-lg font-bold text-gray-900">
                      {commande.montant_total.toFixed(2)} €
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
