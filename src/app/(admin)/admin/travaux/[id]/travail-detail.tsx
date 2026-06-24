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
  Plus,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import {
  getStatusLabel,
  getStatusColor,
  formatDate,
  formatPrice,
} from "@/lib/utils";
import { CertificatModal } from "./certificat-modal";
import { OrthoPanel } from "./ortho-panel";
import { EquipePanel } from "@/components/equipe/equipe-panel";
import { ScanPreview } from "@/components/scans/scan-preview";
import { ProtocoleInstancePanel } from "@/components/protocoles/protocole-instance-panel";
import { StockMovementPanel } from "@/components/stock/stock-movement-panel";
import {
  COMMANDE_FILE_ACCEPT,
  FILE_BUCKET,
  detectFileKind,
  getScanFormat,
  isPreviewable3D,
} from "@/lib/commande-files";

type TravailProps = {
  commande: any;
  currentUserId: string;
  protocoles?: any[];
  protocoleInstances?: any[];
  stockArticles?: any[];
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

export function TravailDetail({ commande, currentUserId, protocoles = [], protocoleInstances = [], stockArticles = [] }: TravailProps) {
  const supabase = createClient();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notesLabo, setNotesLabo] = useState(commande.notes_labo || "");
  const [showCertificat, setShowCertificat] = useState(false);
  const [workflowType, setWorkflowType] = useState("information");
  const [workflowTitle, setWorkflowTitle] = useState("");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [workflowVisible, setWorkflowVisible] = useState(true);
  const [qcLibelle, setQcLibelle] = useState("");
  const [qcKey, setQcKey] = useState("");
  const [qcResult, setQcResult] = useState("conforme");
  const [qcCommentaire, setQcCommentaire] = useState("");
  const [scanFiles, setScanFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<{
    url: string;
    fileName: string;
    format: string | null;
  } | null>(null);

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

    if (notesLabo.trim()) {
      await supabase.from("commande_notes").insert({
        commande_id: commande.id,
        contenu: notesLabo.trim(),
        visible_praticien: false,
        type_note: "interne",
        auteur_id: currentUserId,
      });
    }

    setSaving(false);
  };

  const logWorkflowEvent = async (event: {
    type: string;
    titre: string;
    description?: string;
    ancien_statut?: string | null;
    nouveau_statut?: string | null;
    visible_praticien?: boolean;
    metadata?: Record<string, unknown>;
  }) => {
    await supabase.from("commande_workflow_events").insert({
      commande_id: commande.id,
      commande_item_id: null,
      type: event.type,
      titre: event.titre,
      description: event.description || null,
      ancien_statut: event.ancien_statut || null,
      nouveau_statut: event.nouveau_statut || null,
      visible_praticien: event.visible_praticien ?? true,
      metadata: event.metadata || {},
      created_by: currentUserId,
    });
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
  const workflowEvents = commande.workflow_events || [];
  const notesTechniques = commande.notes_techniques || [];
  const qcChecks = commande.qc_checks || [];

  const createWorkflowEvent = async () => {
    if (!workflowTitle.trim()) return;
    setSaving(true);
    await logWorkflowEvent({
      type: workflowType,
      titre: workflowTitle.trim(),
      description: workflowDescription.trim() || undefined,
      visible_praticien: workflowVisible,
    });
    setWorkflowTitle("");
    setWorkflowDescription("");
    setSaving(false);
    router.refresh();
  };

  const createQcCheck = async () => {
    if (!qcLibelle.trim() || !qcKey.trim()) return;
    setSaving(true);
    await supabase.from("commande_qc_checks").insert({
      commande_id: commande.id,
      commande_item_id: null,
      check_key: qcKey.trim(),
      libelle: qcLibelle.trim(),
      resultat: qcResult,
      commentaire: qcCommentaire.trim() || null,
      checked_by: currentUserId,
      checked_at: new Date().toISOString(),
    });
    await logWorkflowEvent({
      type: "qc",
      titre: `QC: ${qcLibelle.trim()}`,
      description: qcCommentaire.trim() || undefined,
      visible_praticien: true,
      metadata: { check_key: qcKey.trim(), resultat: qcResult },
    });
    setQcLibelle("");
    setQcKey("");
    setQcCommentaire("");
    setQcResult("conforme");
    setSaving(false);
    router.refresh();
  };

  const uploadFiles = async () => {
    if (scanFiles.length === 0) return;

    setUploadingFiles(true);
    for (const file of scanFiles) {
      const fileName = `${commande.id}/${Date.now()}_${file.name}`;
      const fileKind = detectFileKind(file.name, file.type);
      const format3d = getScanFormat(file.name, file.type);
      const { data: latestVersion } = await supabase
        .from("fichiers")
        .select("version")
        .eq("commande_id", commande.id)
        .eq("storage_bucket", FILE_BUCKET)
        .eq("file_kind", fileKind)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const version = (latestVersion?.version || 0) + 1;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(FILE_BUCKET)
        .upload(fileName, file);

      if (!uploadError && uploadData) {
        await supabase.from("fichiers").insert({
          commande_id: commande.id,
          nom_fichier: fileName,
          nom_original: file.name,
          type_mime: file.type,
          taille: file.size,
          storage_bucket: FILE_BUCKET,
          storage_path: uploadData.path,
          uploaded_by: currentUserId,
          uploaded_via: "invitation_labo",
          file_kind: fileKind,
          format_3d: format3d,
          version,
          apercu_disponible: Boolean(format3d && isPreviewable3D(file.name, file.type)),
        });
      }
    }

    await logWorkflowEvent({
      type: "scan",
      titre: `${scanFiles.length} fichier(s) ajouté(s) par le laboratoire`,
      visible_praticien: true,
      metadata: { count: scanFiles.length },
    });

    setScanFiles([]);
    setUploadingFiles(false);
    router.refresh();
  };

  const openPreview = (file: any) => {
    const { data } = supabase.storage
      .from(file.storage_bucket || FILE_BUCKET)
      .getPublicUrl(file.storage_path);

    setPreviewTarget({
      url: data.publicUrl,
      fileName: file.nom_original,
      format: file.format_3d || getScanFormat(file.nom_original, file.type_mime),
    });
  };

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
                          <p className="text-xs text-gray-400">
                            {f.file_kind}
                            {typeof f.version === "number" ? ` • v${f.version}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {f.apercu_disponible && isPreviewable3D(f.nom_original, f.type_mime) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => openPreview(f)}
                          >
                            Aperçu
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Upload scans / documents */}
          <Card>
            <CardHeader>
              <CardTitle>Ajouter un scan ou document</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <input
                type="file"
                multiple
                accept={COMMANDE_FILE_ACCEPT}
                onChange={(e) => setScanFiles(Array.from(e.target.files || []))}
                className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-sky-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-sky-700 hover:file:bg-sky-100"
              />
              {scanFiles.length > 0 && (
                <div className="space-y-1 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                  {scanFiles.map((file) => (
                    <p key={file.name}>{file.name}</p>
                  ))}
                </div>
              )}
              <Button
                onClick={uploadFiles}
                disabled={uploadingFiles || scanFiles.length === 0}
                className="w-full gap-2 bg-sky-600 hover:bg-sky-700"
              >
                {uploadingFiles ? "Upload..." : "Ajouter les fichiers"}
              </Button>
            </CardContent>
          </Card>
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


          {/* Historique de production */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="h-4 w-4 text-sky-600" />
                Historique de production
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {workflowEvents.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Aucun événement enregistré.
                </p>
              ) : (
                workflowEvents.map((event: any) => (
                  <div
                    key={event.id}
                    className={`rounded-lg border p-3 ${
                      event.visible_praticien
                        ? "border-sky-100 bg-sky-50/60"
                        : "border-gray-100 bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {event.titre}
                      </p>
                      <Badge variant={event.visible_praticien ? "default" : "info"}>
                        {event.type}
                      </Badge>
                    </div>
                    {event.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {event.description}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(event.created_at)}
                    </p>
                  </div>
                ))
              )}

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-sm font-medium text-gray-900">
                  Ajouter un événement
                </p>
                <div className="grid gap-2">
                  <select
                    value={workflowType}
                    onChange={(e) => setWorkflowType(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="information">Information</option>
                    <option value="scan">Scan</option>
                    <option value="conception">Conception</option>
                    <option value="fabrication">Fabrication</option>
                    <option value="retouche">Retouche</option>
                    <option value="livraison">Livraison</option>
                    <option value="note">Note</option>
                  </select>
                  <input
                    value={workflowTitle}
                    onChange={(e) => setWorkflowTitle(e.target.value)}
                    placeholder="Titre de l'événement"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <textarea
                    value={workflowDescription}
                    onChange={(e) => setWorkflowDescription(e.target.value)}
                    placeholder="Description"
                    rows={2}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={workflowVisible}
                      onChange={(e) => setWorkflowVisible(e.target.checked)}
                    />
                    Visible au praticien
                  </label>
                  <Button
                    onClick={createWorkflowEvent}
                    disabled={saving || !workflowTitle.trim()}
                    size="sm"
                    className="gap-2 bg-sky-600 hover:bg-sky-700"
                  >
                    <Plus className="h-4 w-4" />
                    Ajouter
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Checklist QC */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileCheck className="h-4 w-4 text-sky-600" />
                Contrôle qualité
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {qcChecks.length === 0 ? (
                <p className="text-sm text-gray-400">Aucun contrôle QC.</p>
              ) : (
                qcChecks.map((check: any) => (
                  <div key={check.id} className="rounded-lg border border-gray-100 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {check.libelle}
                      </p>
                      <Badge
                        variant={
                          check.resultat === "conforme"
                            ? "success"
                            : check.resultat === "a_corriger"
                              ? "warning"
                              : "danger"
                        }
                      >
                        {check.resultat}
                      </Badge>
                    </div>
                    {check.commentaire && (
                      <p className="mt-1 text-sm text-gray-600">
                        {check.commentaire}
                      </p>
                    )}
                  </div>
                ))
              )}

              <div className="rounded-lg border border-gray-200 p-3">
                <p className="mb-2 text-sm font-medium text-gray-900">
                  Ajouter un contrôle
                </p>
                <div className="grid gap-2">
                  <input
                    value={qcKey}
                    onChange={(e) => setQcKey(e.target.value)}
                    placeholder="Clé technique (ex: ajustement_marge)"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={qcLibelle}
                    onChange={(e) => setQcLibelle(e.target.value)}
                    placeholder="Libellé QC"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <select
                    value={qcResult}
                    onChange={(e) => setQcResult(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="conforme">Conforme</option>
                    <option value="a_corriger">À corriger</option>
                    <option value="non_conforme">Non conforme</option>
                  </select>
                  <textarea
                    value={qcCommentaire}
                    onChange={(e) => setQcCommentaire(e.target.value)}
                    placeholder="Commentaire QC"
                    rows={2}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <Button
                    onClick={createQcCheck}
                    disabled={saving || !qcLibelle.trim() || !qcKey.trim()}
                    size="sm"
                    className="gap-2 bg-sky-600 hover:bg-sky-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Valider le contrôle
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes partagées */}
          {notesTechniques.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-4 w-4 text-sky-600" />
                  Notes techniques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {notesTechniques.map((note: any) => (
                  <div key={note.id} className="rounded-lg border border-gray-100 p-3">
                    <p className="text-sm text-gray-700">{note.contenu}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {formatDate(note.created_at)} • {note.type_note}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
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
                    <p className="text-xs text-green-700">
                      Statut: {commande.certificat.statut || "brouillon"}
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
      {(() => {
        const items = (commande.items || []) as any[];
        const hasOrtho =
          items.some(
            (item: any) =>
              item.type_travail === "orthodontie" ||
              item.type_travail === "gouttiere" ||
              item.mode_fabrication === "orthodontie"
          ) || !!commande.ortho;

        if (!hasOrtho) return null;

        const dossier = commande.ortho || {
          commande_id: commande.id,
          type_traitement: "aligneurs" as const,
          plan_traitement: null,
          nb_aligneurs: 0,
          etape_courante: 0,
          date_debut: null,
          date_fin_prevue: null,
          date_fin_reelle: null,
          notes: null,
          etapes: [] as any[],
        };

        return (
          <div className="mt-6">
            <OrthoPanel
              commandeId={commande.id}
              initialDossier={{
                id: dossier.id,
                commande_id: commande.id,
                commande_item_id: dossier.commande_item_id ?? null,
                type_traitement: dossier.type_traitement,
                plan_traitement: dossier.plan_traitement,
                nb_aligneurs: dossier.nb_aligneurs ?? 0,
                etape_courante: dossier.etape_courante ?? 0,
                date_debut: dossier.date_debut,
                date_fin_prevue: dossier.date_fin_prevue,
                date_fin_reelle: dossier.date_fin_reelle,
                notes: dossier.notes,
                etapes: (dossier.etapes || []).map((e: any) => ({
                  id: e.id,
                  numero: e.numero,
                  label: e.label,
                  date_prevue: e.date_prevue,
                  date_realisee: e.date_realisee,
                  statut: e.statut,
                  notes: e.notes,
                })),
              }}
            />
          </div>
        );
      })()}

      <div className="mt-6">
        <EquipePanel
          commandeId={commande.id}
          collaborateurs={(commande.collaborateurs as any[]) || []}
          initialAssignations={(commande.assignations as any[]) || []}
          initialTaches={(commande.taches as any[]) || []}
        />
      </div>

      <div className="mt-6">
        <ProtocoleInstancePanel
          commandeId={commande.id}
          patientId={commande.patient?.id ?? commande.patient_id ?? null}
          dentisteId={commande.dentiste?.id ?? commande.dentiste_id ?? null}
          items={(commande.items as any[]) || []}
          protocoles={protocoles}
          instances={protocoleInstances}
        />
      </div>

      <div className="mt-6">
        <StockMovementPanel
          articles={stockArticles}
          fixedCommandeId={commande.id}
          title="Consommer du stock pour ce travail"
        />
      </div>

      {/* Modal certificat */}
      {showCertificat && (
        <CertificatModal
          commande={commande}
          certificat={commande.certificat}
          currentUserId={currentUserId}
          onClose={() => {
            setShowCertificat(false);
            router.refresh();
          }}
        />
      )}

      {previewTarget && (
        <ScanPreview
          open={Boolean(previewTarget)}
          onClose={() => setPreviewTarget(null)}
          url={previewTarget.url}
          fileName={previewTarget.fileName}
          format={previewTarget.format}
        />
      )}
    </div>
  );
}
