"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  Package,
  FileText,
  Clock,
  CheckCircle2,
  Truck,
  FileCheck,
  Edit3,
  Printer,
  Send,
  Download,
  MapPin,
  CalendarDays,
  File,
} from "lucide-react";
import {
  getStatusLabel,
  getStatusColor,
  formatDate,
  formatPrice,
} from "@/lib/utils";
import { CertificatModal } from "./certificat-modal";

type TravailProps = {
  commande: any;
  currentUserId: string;
};

const STATUT_STEPS = [
  { key: "en_attente", label: "Reçu", icon: Package },
  { key: "acceptee", label: "Accepté", icon: CheckCircle2 },
  { key: "en_cours", label: "Fabrication", icon: Clock },
  { key: "controle_qualite", label: "Contrôle qualité", icon: FileCheck },
  { key: "terminee", label: "Terminé", icon: CheckCircle2 },
  { key: "expediee", label: "Expédié", icon: Truck },
  { key: "livree", label: "Livré", icon: CheckCircle2 },
];

const STATUT_ORDER = [
  "brouillon",
  "en_attente",
  "acceptee",
  "en_cours",
  "controle_qualite",
  "terminee",
  "expediee",
  "livree",
];

export function TravailDetail({ commande, currentUserId }: TravailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notesLabo, setNotesLabo] = useState(commande.notes_labo || "");
  const [showCertificat, setShowCertificat] = useState(false);

  const currentIdx = STATUT_ORDER.indexOf(commande.statut);

  const updateStatut = async (newStatut: string) => {
    setSaving(true);
    await supabase
      .from("commandes")
      .update({ statut: newStatut })
      .eq("id", commande.id);
    setSaving(false);
    router.refresh();
  };

  const saveNotes = async () => {
    setSaving(true);
    await supabase
      .from("commandes")
      .update({ notes_labo: notesLabo })
      .eq("id", commande.id);
    setSaving(false);
  };

  const nextStatut =
    currentIdx < STATUT_ORDER.length - 1
      ? STATUT_ORDER[currentIdx + 1]
      : null;

  const typeLabel = (t: string) =>
    t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

  const dentiste = commande.dentiste;
  const patient = commande.patient;
  const items = commande.items || [];
  const fichiers = commande.fichiers || [];

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/travaux"
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {commande.numero}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusColor(commande.statut)}`}
              >
                {getStatusLabel(commande.statut)}
              </span>
              <Badge
                variant={
                  commande.priorite === "urgente"
                    ? "danger"
                    : commande.priorite === "express"
                      ? "warning"
                      : "default"
                }
              >
                {commande.priorite}
              </Badge>
            </div>
            <p className="text-sm text-gray-500">
              Créé le {formatDate(commande.created_at)}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {nextStatut && commande.statut !== "annulee" && (
            <Button
              onClick={() => updateStatut(nextStatut)}
              disabled={saving}
              className="gap-2 bg-sky-600 hover:bg-sky-700"
            >
              Passer à : {getStatusLabel(nextStatut)}
            </Button>
          )}
        </div>
      </div>

      {/* Timeline de statut */}
      <Card className="mb-6">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            {STATUT_STEPS.map((step, i) => {
              const stepIdx = STATUT_ORDER.indexOf(step.key);
              const done = currentIdx >= stepIdx;
              const active = commande.statut === step.key;
              return (
                <div key={step.key} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full ${
                        active
                          ? "bg-sky-600 text-white ring-4 ring-sky-100"
                          : done
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 text-gray-400"
                      }`}
                    >
                      <step.icon className="h-5 w-5" />
                    </div>
                    <span
                      className={`mt-2 text-xs font-medium ${active ? "text-sky-700" : done ? "text-green-700" : "text-gray-400"}`}
                    >
                      {step.label}
                    </span>
                  </div>
                  {i < STATUT_STEPS.length - 1 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 ${
                        currentIdx > stepIdx ? "bg-green-400" : "bg-gray-200"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Colonne gauche — Info & travaux */}
        <div className="space-y-6 lg:col-span-2">
          {/* Patient & Dentiste */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-sky-600" />
                  Patient
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient ? (
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      {patient.prenom} {patient.nom}
                    </p>
                    <p className="text-sm text-gray-500">{patient.reference}</p>
                    {patient.date_naissance && (
                      <p className="text-sm text-gray-500">
                        Né(e) le{" "}
                        {new Date(patient.date_naissance).toLocaleDateString(
                          "fr-FR"
                        )}
                      </p>
                    )}
                    {patient.sexe && (
                      <p className="text-sm text-gray-500">
                        Sexe :{" "}
                        {patient.sexe === "M"
                          ? "Masculin"
                          : patient.sexe === "F"
                            ? "Féminin"
                            : "Autre"}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">
                    {commande.patient_ref || "Non renseigné"}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <User className="h-4 w-4 text-sky-600" />
                  Praticien
                </CardTitle>
              </CardHeader>
              <CardContent>
                {dentiste ? (
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900">
                      Dr {dentiste.prenom} {dentiste.nom}
                    </p>
                    <p className="text-sm text-gray-500">{dentiste.email}</p>
                    {dentiste.numero_inami && (
                      <p className="text-sm text-gray-500">
                        INAMI : {dentiste.numero_inami}
                      </p>
                    )}
                    {dentiste.telephone && (
                      <p className="text-sm text-gray-500">
                        {dentiste.telephone}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400">Non renseigné</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mode de réception */}
          {commande.mode_reception === "enlevement" && (
            <Card>
              <CardContent className="flex items-start gap-3 p-5">
                <MapPin className="mt-0.5 h-5 w-5 text-orange-500" />
                <div>
                  <p className="font-medium text-gray-900">
                    Mode : Enlèvement
                  </p>
                  {commande.adresse_enlevement && (
                    <p className="text-sm text-gray-600">
                      {commande.adresse_enlevement}
                    </p>
                  )}
                  {commande.date_enlevement && (
                    <p className="flex items-center gap-1 text-sm text-gray-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(commande.date_enlevement).toLocaleDateString(
                        "fr-FR"
                      )}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Travaux détaillés */}
          <Card>
            <CardHeader>
              <CardTitle>Travaux demandés ({items.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun travail détaillé</p>
              ) : (
                items.map((item: any, i: number) => (
                  <div
                    key={item.id || i}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-sky-100 px-2 py-0.5 text-sm font-medium text-sky-700">
                        {typeLabel(item.type_travail)}
                      </span>
                      {item.materiau && (
                        <span className="rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                          {typeLabel(item.materiau)}
                        </span>
                      )}
                      {item.teinte && (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-700">
                          Teinte {item.teinte}
                        </span>
                      )}
                    </div>
                    {item.dents && item.dents.length > 0 && (
                      <p className="mt-1 text-sm text-gray-600">
                        Dents : {item.dents.join(", ")}
                      </p>
                    )}
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500">
                        {item.description}
                      </p>
                    )}
                    {item.notes && (
                      <p className="mt-1 text-sm italic text-gray-400">
                        {item.notes}
                      </p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Fichiers */}
          {fichiers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Fichiers ({fichiers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {fichiers.map((f: any) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <File className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {f.nom_original}
                          </p>
                          <p className="text-xs text-gray-400">
                            {f.type_mime} •{" "}
                            {f.taille
                              ? (f.taille / 1024 / 1024).toFixed(2) + " MB"
                              : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Edit3 className="h-4 w-4 text-sky-600" />
                Notes du laboratoire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commande.notes_dentiste && (
                <div className="rounded-lg bg-blue-50 p-3">
                  <p className="mb-1 text-xs font-medium text-blue-600">
                    Notes du dentiste :
                  </p>
                  <p className="text-sm text-blue-800">
                    {commande.notes_dentiste}
                  </p>
                </div>
              )}
              <textarea
                value={notesLabo}
                onChange={(e) => setNotesLabo(e.target.value)}
                placeholder="Ajouter des notes internes..."
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <Button
                onClick={saveNotes}
                disabled={saving}
                size="sm"
                variant="outline"
                className="w-full"
              >
                Enregistrer les notes
              </Button>
            </CardContent>
          </Card>

          {/* Montant */}
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-gray-500">Montant total</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatPrice(commande.montant_total || 0)}
              </p>
              <p className="mt-1 text-xs capitalize text-gray-400">
                Paiement : {commande.statut_paiement?.replace("_", " ")}
              </p>
            </CardContent>
          </Card>

          {/* Certificat de conformité */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-sky-600" />
                Certificat de conformité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {commande.certificat ? (
                <div className="space-y-3">
                  <div className="rounded-lg bg-green-50 p-3">
                    <p className="text-sm font-medium text-green-700">
                      {commande.certificat.numero_certificat}
                    </p>
                    <p className="text-xs text-green-600">
                      Émis le{" "}
                      {new Date(
                        commande.certificat.date_emission
                      ).toLocaleDateString("fr-FR")}
                    </p>
                    {commande.certificat.envoye_au_praticien && (
                      <p className="mt-1 text-xs text-green-600">
                        ✓ Envoyé au praticien
                      </p>
                    )}
                  </div>
                  <Button
                    onClick={() => setShowCertificat(true)}
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Voir / Modifier
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">
                    Aucun certificat généré pour ce travail.
                  </p>
                  <Button
                    onClick={() => setShowCertificat(true)}
                    className="w-full gap-2 bg-sky-600 hover:bg-sky-700"
                    size="sm"
                  >
                    <FileCheck className="h-4 w-4" />
                    Générer le certificat
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {commande.statut !== "annulee" && (
                <Button
                  onClick={() => updateStatut("annulee")}
                  disabled={saving}
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 hover:bg-red-50"
                >
                  Annuler le travail
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal certificat */}
      {showCertificat && (
        <CertificatModal
          commande={commande}
          certificat={commande.certificat}
          onClose={() => {
            setShowCertificat(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
