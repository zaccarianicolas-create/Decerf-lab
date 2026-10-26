"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Paperclip, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import {
  COMMANDE_FILE_ACCEPT,
  FILE_BUCKET,
  detectFileKind,
  getScanFormat,
  isPreviewable3D,
} from "@/lib/commande-files";

type DentistOption = { id: string; nom: string; prenom: string };
type PatientOption = { id: string; reference: string; nom: string; prenom: string };
type ServiceOption = { id: string; nom: string };
export type TechnicienCommandeService = {
  id: string;
  nom: string;
  type_travail: string | null;
  materiaux_disponibles: string[] | null;
  demander_dents: boolean;
  demander_materiau: boolean;
  demander_teinte: boolean;
  demander_notes: boolean;
  instructions: string | null;
  duree_estimee_jours: number | null;
  mode_fourniture: string;
  options: ServiceOption[];
};

type WorkItem = {
  service_labo_id: string;
  options_selectionnees: string[];
  dents: string;
  materiau: string;
  teinte: string;
  notes: string;
};

const newWorkItem = (): WorkItem => ({
  service_labo_id: "",
  options_selectionnees: [],
  dents: "",
  materiau: "",
  teinte: "",
  notes: "",
});

const MATERIAL_LABELS: Record<string, string> = {
  zircone: "Zircone",
  emax: "E.max",
  metal: "Métal",
  ceramique: "Céramique",
  resine: "Résine",
  composite: "Composite",
  titane: "Titane",
  chrome_cobalt: "Chrome-Cobalt",
  autre: "Autre",
};

const SHADES = [
  "A1", "A2", "A3", "A3.5", "A4", "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4", "D2", "D3", "D4", "BL1", "BL2", "BL3", "BL4",
];

export function TechnicienCommandeForm({
  dentists,
  services,
}: {
  dentists: DentistOption[];
  services: TechnicienCommandeService[];
}) {
  const router = useRouter();
  const [supabase] = useState(() => createClient());
  const [dentistId, setDentistId] = useState("");
  const [patients, setPatients] = useState<PatientOption[]>([]);
  const [patientId, setPatientId] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [patientRef, setPatientRef] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<WorkItem[]>([newWorkItem()]);
  const [files, setFiles] = useState<File[]>([]);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [patientForm, setPatientForm] = useState({ nom: "", prenom: "", date_naissance: "" });
  const [creatingPatient, setCreatingPatient] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateItem = (index: number, patch: Partial<WorkItem>) => {
    setItems((current) => current.map((item, itemIndex) =>
      itemIndex === index ? { ...item, ...patch } : item
    ));
  };

  const createPatient = async () => {
    if (!dentistId) return;
    if (!patientForm.nom.trim() || !patientForm.prenom.trim()) {
      setError("Le nom et le prénom du patient sont requis.");
      return;
    }
    setCreatingPatient(true);
    setError(null);
    try {
      const response = await fetch("/api/technicien/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dentiste_id: dentistId,
          nom: patientForm.nom.trim(),
          prenom: patientForm.prenom.trim(),
          date_naissance: patientForm.date_naissance || null,
        }),
      });
      const result = await response.json() as { patient?: PatientOption; error?: string };
      if (!response.ok || !result.patient) throw new Error(result.error || "Création du patient impossible.");
      setPatients((current) => [...current, result.patient!].sort((a, b) => a.nom.localeCompare(b.nom)));
      setPatientId(result.patient.id);
      setPatientForm({ nom: "", prenom: "", date_naissance: "" });
      setShowPatientForm(false);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Création du patient impossible.");
    } finally {
      setCreatingPatient(false);
    }
  };

  const changeDentist = async (newDentistId: string) => {
    setDentistId(newDentistId);
    setPatientId("");
    setPatients([]);
    setError(null);
    if (!newDentistId) return;
    setLoadingPatients(true);
    try {
      const response = await fetch(`/api/technicien/patients?dentiste_id=${encodeURIComponent(newDentistId)}`);
      const result = await response.json() as { patients?: PatientOption[]; error?: string };
      if (!response.ok) throw new Error(result.error || "Chargement des patients impossible.");
      setPatients(result.patients ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Chargement des patients impossible.");
    } finally {
      setLoadingPatients(false);
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!dentistId) return setError("Sélectionnez un dentiste.");
    if (items.some((item) => !item.service_labo_id)) return setError("Sélectionnez un service pour chaque travail.");
    setSaving(true);
    try {
      const response = await fetch("/api/technicien/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dentiste_id: dentistId,
          patient_id: patientId || null,
          patient_ref: patientRef.trim() || null,
          notes: notes.trim() || null,
          date_livraison: dueDate || null,
          items: items.map((item) => ({
            service_labo_id: item.service_labo_id,
            options_selectionnees: item.options_selectionnees,
            dents: item.dents,
            materiau: item.materiau,
            teinte: item.teinte,
            notes: item.notes,
            quantite: 1,
          })),
        }),
      });
      const result = await response.json() as { commande?: { id: string; numero: string }; error?: string };
      if (!response.ok || !result.commande) throw new Error(result.error || "Création de commande impossible.");

      let uploadFailures = 0;
      if (files.length) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          uploadFailures = files.length;
        } else {
          for (const file of files) {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
            const path = `${result.commande.id}/commande-papier/${crypto.randomUUID()}_${safeName}`;
            const fileKind = detectFileKind(file.name, file.type);
            const format3d = getScanFormat(file.name, file.type);
            const { data: uploaded, error: uploadError } = await supabase.storage
              .from(FILE_BUCKET)
              .upload(path, file);
            if (uploadError || !uploaded) {
              uploadFailures += 1;
              continue;
            }
            const { error: recordError } = await supabase.from("fichiers").insert({
              commande_id: result.commande.id,
              nom_fichier: path,
              nom_original: file.name,
              type_mime: file.type || null,
              taille: file.size,
              storage_bucket: FILE_BUCKET,
              storage_path: uploaded.path,
              uploaded_by: user.id,
              uploaded_via: "inscription_site",
              file_kind: fileKind,
              format_3d: format3d,
              version: 1,
              apercu_disponible: Boolean(format3d && isPreviewable3D(file.name, file.type)),
            });
            if (recordError) uploadFailures += 1;
          }
        }
      }
      if (uploadFailures) {
        window.alert(`Commande ${result.commande.numero} créée, mais ${uploadFailures} fichier(s) n’ont pas pu être joints.`);
      }
      router.push(`/atelier/commandes/${result.commande.id}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Création de commande impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex items-start gap-3">
        <Link href="/atelier" aria-label="Retour à l’atelier" className="rounded-md border border-gray-200 p-2 hover:bg-gray-50">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Saisir une commande papier</h1>
          <p className="mt-1 text-sm text-gray-500">Enregistrer une prescription reçue au laboratoire.</p>
        </div>
      </div>

      {error && <p role="alert" className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}

      <Card>
        <CardHeader><CardTitle>Dentiste et patient</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Dentiste *</label>
            <select required value={dentistId} onChange={(event) => void changeDentist(event.target.value)} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
              <option value="">Sélectionner un dentiste…</option>
              {dentists.map((dentist) => <option key={dentist.id} value={dentist.id}>Dr {dentist.prenom} {dentist.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Patient (facultatif)</label>
            <select value={patientId} onChange={(event) => setPatientId(event.target.value)} disabled={!dentistId || loadingPatients} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm disabled:bg-gray-50">
              <option value="">Sans patient / référence libre</option>
              {patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.reference} · {patient.prenom} {patient.nom}</option>)}
            </select>
            {loadingPatients && <p className="mt-1 text-xs text-gray-500">Chargement des patients…</p>}
            {dentistId && <button type="button" onClick={() => setShowPatientForm((open) => !open)} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:underline"><Plus className="h-4 w-4" /> Ajouter un patient à ce dentiste</button>}
          </div>
          {showPatientForm && (
            <div className="rounded-md border border-sky-200 bg-sky-50/50 p-4">
              <h2 className="mb-3 text-sm font-semibold text-gray-900">Nouveau patient</h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Prénom *" required value={patientForm.prenom} onChange={(event) => setPatientForm({ ...patientForm, prenom: event.target.value })} />
                <Input label="Nom *" required value={patientForm.nom} onChange={(event) => setPatientForm({ ...patientForm, nom: event.target.value })} />
                <Input label="Date de naissance" type="date" value={patientForm.date_naissance} onChange={(event) => setPatientForm({ ...patientForm, date_naissance: event.target.value })} />
              </div>
              <Button type="button" size="sm" className="mt-3" disabled={creatingPatient} onClick={() => void createPatient()}>{creatingPatient ? "Création…" : "Créer le patient"}</Button>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Référence papier (facultatif)" value={patientRef} onChange={(event) => setPatientRef(event.target.value)} />
            <Input label="Date d’échéance souhaitée" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Travaux demandés</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setItems((current) => [...current, newWorkItem()])}><Plus className="mr-1 h-4 w-4" />Ajouter un travail</Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, index) => {
            const service = services.find((entry) => entry.id === item.service_labo_id);
            return (
              <div key={index} className="space-y-4 rounded-md border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">Travail {index + 1}</p>
                  {items.length > 1 && <button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Supprimer ce travail" className="rounded p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Service *</label>
                  <select required value={item.service_labo_id} onChange={(event) => updateItem(index, { service_labo_id: event.target.value, options_selectionnees: [] })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm">
                    <option value="">Sélectionner un service…</option>
                    {services.map((entry) => <option key={entry.id} value={entry.id}>{entry.nom}{entry.duree_estimee_jours ? ` (≈ ${entry.duree_estimee_jours} j)` : ""}</option>)}
                  </select>
                  {service && <p className="mt-2 text-xs text-gray-500">{service.mode_fourniture.replace(/_/g, " ")}{service.duree_estimee_jours ? ` · environ ${service.duree_estimee_jours} jours` : ""}{service.instructions ? ` · ${service.instructions}` : ""}</p>}
                </div>
                {service?.options.length ? (
                  <fieldset className="space-y-2 rounded-md border border-amber-200 bg-amber-50/40 p-3">
                    <legend className="px-1 text-sm font-medium text-gray-800">Options facturables</legend>
                    {service.options.map((option) => {
                      const checked = item.options_selectionnees.includes(option.id);
                      return <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={checked} onChange={() => updateItem(index, { options_selectionnees: checked ? item.options_selectionnees.filter((id) => id !== option.id) : [...item.options_selectionnees, option.id] })} className="h-4 w-4 rounded border-gray-300 text-sky-600" />{option.nom}</label>;
                    })}
                  </fieldset>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {service?.demander_dents !== false && <Input label="Dents (n°)" placeholder="11, 12, 21" value={item.dents} onChange={(event) => updateItem(index, { dents: event.target.value })} />}
                  {service?.demander_materiau !== false && <div><label className="mb-1 block text-sm font-medium text-gray-700">Matériau</label><select value={item.materiau} onChange={(event) => updateItem(index, { materiau: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="">Sélectionner…</option>{(service?.materiaux_disponibles ?? []).map((material) => <option key={material} value={material}>{MATERIAL_LABELS[material] || material.replace(/_/g, " ")}</option>)}</select></div>}
                  {service?.demander_teinte !== false && <div><label className="mb-1 block text-sm font-medium text-gray-700">Teinte</label><select value={item.teinte} onChange={(event) => updateItem(index, { teinte: event.target.value })} className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"><option value="">Sélectionner…</option>{SHADES.map((shade) => <option key={shade} value={shade}>{shade}</option>)}</select></div>}
                  {service?.demander_notes !== false && <Input label="Notes pour ce travail" value={item.notes} onChange={(event) => updateItem(index, { notes: event.target.value })} />}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Prescription papier ou scan (facultatif)</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50"><Paperclip className="h-4 w-4" /><span>Joindre un PDF, une photo ou un scan</span><input type="file" accept={COMMANDE_FILE_ACCEPT} multiple className="sr-only" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} /></label>
          {files.length > 0 && <ul className="space-y-1 text-xs text-gray-600">{files.map((file, index) => <li key={`${file.name}-${index}`}>{file.name}</li>)}</ul>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-4">
          <label className="block text-sm font-medium text-gray-700">Notes générales (facultatif)</label>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Link href="/atelier" className="inline-flex min-h-10 items-center rounded-md border border-gray-300 px-4 text-sm text-gray-700">Annuler</Link>
        <Button type="submit" disabled={saving}>{saving ? "Création…" : "Créer et assigner la commande"}</Button>
      </div>
    </form>
  );
}
