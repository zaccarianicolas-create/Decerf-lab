"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Upload, Users, UserPlus, Truck, Monitor } from "lucide-react";

const itemSchema = z.object({
  type_travail: z.string().min(1, "Requis"),
  description: z.string().optional(),
  dents: z.string().optional(),
  materiau: z.string().optional(),
  teinte: z.string().optional(),
  notes: z.string().optional(),
});

const commandeSchema = z.object({
  patient_id: z.string().optional(),
  patient_ref: z.string().optional(),
  new_patient_nom: z.string().optional(),
  new_patient_prenom: z.string().optional(),
  new_patient_date_naissance: z.string().optional(),
  new_patient_sexe: z.string().optional(),
  mode_reception: z.enum(["envoi_numerique", "enlevement"]),
  adresse_enlevement: z.string().optional(),
  date_enlevement: z.string().optional(),
  priorite: z.enum(["normale", "urgente", "express"]),
  date_souhaitee: z.string().optional(),
  notes_dentiste: z.string().optional(),
  items: z.array(itemSchema).min(1, "Ajoutez au moins un travail"),
});

type CommandeForm = z.infer<typeof commandeSchema>;

const typesTravauxOptions = [
  { value: "couronne", label: "Couronne" },
  { value: "bridge", label: "Bridge" },
  { value: "inlay_onlay", label: "Inlay / Onlay" },
  { value: "facette", label: "Facette" },
  { value: "prothese_amovible", label: "Prothèse amovible" },
  { value: "prothese_complete", label: "Prothèse complète" },
  { value: "implant", label: "Implant" },
  { value: "orthodontie", label: "Orthodontie" },
  { value: "gouttiere", label: "Gouttière" },
  { value: "autre", label: "Autre" },
];

const materiauxOptions = [
  { value: "zircone", label: "Zircone" },
  { value: "emax", label: "E.max" },
  { value: "metal", label: "Métal" },
  { value: "ceramique", label: "Céramique" },
  { value: "resine", label: "Résine" },
  { value: "composite", label: "Composite" },
  { value: "titane", label: "Titane" },
  { value: "chrome_cobalt", label: "Chrome-Cobalt" },
  { value: "autre", label: "Autre" },
];

const teintesOptions = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
  "BL1", "BL2", "BL3", "BL4",
];

export default function NouvelleCommandePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [patientMode, setPatientMode] = useState<"existing" | "new">("existing");

  const supabase = createClient();

  // Load patients
  useEffect(() => {
    const load = async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data } = await supabase
        .from("patients")
        .select("id, reference, nom, prenom")
        .eq("dentiste_id", userData.user.id)
        .eq("actif", true)
        .order("nom");
      setPatients(data ?? []);
    };
    load();
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CommandeForm>({
    resolver: zodResolver(commandeSchema),
    defaultValues: {
      priorite: "normale",
      mode_reception: "envoi_numerique",
      items: [{ type_travail: "", dents: "", materiau: "", teinte: "" }],
    },
  });

  const modeReception = watch("mode_reception");

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items",
  });

  const onSubmit = async (data: CommandeForm) => {
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let patientId = data.patient_id || null;

    // Create new patient if needed
    if (patientMode === "new" && data.new_patient_nom && data.new_patient_prenom) {
      const { data: newPatient, error: patErr } = await supabase
        .from("patients")
        .insert({
          dentiste_id: user.id,
          nom: data.new_patient_nom,
          prenom: data.new_patient_prenom,
          date_naissance: data.new_patient_date_naissance || null,
          sexe: data.new_patient_sexe || null,
        })
        .select()
        .single();

      if (patErr || !newPatient) {
        setError("Erreur lors de la création du patient");
        return;
      }
      patientId = newPatient.id;
    }

    // Créer la commande
    const { data: commande, error: cmdError } = await supabase
      .from("commandes")
      .insert({
        dentiste_id: user.id,
        patient_id: patientId,
        patient_ref: data.patient_ref || null,
        mode_reception: data.mode_reception,
        adresse_enlevement: data.mode_reception === "enlevement" ? data.adresse_enlevement || null : null,
        date_enlevement: data.mode_reception === "enlevement" ? data.date_enlevement || null : null,
        priorite: data.priorite,
        date_souhaitee: data.date_souhaitee || null,
        notes_dentiste: data.notes_dentiste || null,
        statut: "en_attente",
      })
      .select()
      .single();

    if (cmdError || !commande) {
      setError("Erreur lors de la création de la commande");
      return;
    }

    // Créer les items
    const items = data.items.map((item) => ({
      commande_id: commande.id,
      type_travail: item.type_travail,
      description: item.description || null,
      dents: item.dents ? item.dents.split(",").map((d) => d.trim()) : null,
      materiau: item.materiau || null,
      teinte: item.teinte || null,
      notes: item.notes || null,
    }));

    await supabase.from("commande_items").insert(items);

    // Upload fichiers STL
    if (files.length > 0) {
      for (const file of files) {
        const fileName = `${commande.id}/${Date.now()}_${file.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("fichiers-stl")
          .upload(fileName, file);

        if (!uploadError && uploadData) {
          await supabase.from("fichiers").insert({
            commande_id: commande.id,
            nom_fichier: fileName,
            nom_original: file.name,
            type_mime: file.type,
            taille: file.size,
            storage_path: uploadData.path,
            uploaded_by: user.id,
          });
        }
      }
    }

    router.push("/dashboard/commandes");
    router.refresh();
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle commande</h1>
        <p className="text-sm text-gray-500">
          Décrivez les travaux souhaités pour votre patient
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Patient */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-sky-600" />
              Patient
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Toggle existing / new */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setPatientMode("existing")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                  patientMode === "existing"
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <Users className="mb-1 h-4 w-4" />
                <span className="font-medium">Patient existant</span>
              </button>
              <button
                type="button"
                onClick={() => setPatientMode("new")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                  patientMode === "new"
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <UserPlus className="mb-1 h-4 w-4" />
                <span className="font-medium">Nouveau patient</span>
              </button>
            </div>

            {patientMode === "existing" ? (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Sélectionner un patient
                </label>
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  {...register("patient_id")}
                >
                  <option value="">Choisir un patient...</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.prenom} {p.nom} ({p.reference})
                    </option>
                  ))}
                </select>
                {patients.length === 0 && (
                  <p className="text-xs text-gray-400">
                    Aucun patient enregistré.{" "}
                    <button
                      type="button"
                      onClick={() => setPatientMode("new")}
                      className="text-sky-600 hover:underline"
                    >
                      Créer un nouveau patient
                    </button>
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  label="Prénom *"
                  placeholder="Jean"
                  {...register("new_patient_prenom")}
                />
                <Input
                  label="Nom *"
                  placeholder="Dupont"
                  {...register("new_patient_nom")}
                />
                <Input
                  label="Date de naissance"
                  type="date"
                  {...register("new_patient_date_naissance")}
                />
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">
                    Sexe
                  </label>
                  <select
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    {...register("new_patient_sexe")}
                  >
                    <option value="">Non renseigné</option>
                    <option value="M">Masculin</option>
                    <option value="F">Féminin</option>
                    <option value="X">Autre</option>
                  </select>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mode de réception + Infos générales */}
        <Card>
          <CardHeader>
            <CardTitle>Mode de réception & Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Mode de réception */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Mode de réception
              </label>
              <div className="flex gap-3">
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                    modeReception === "envoi_numerique"
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value="envoi_numerique"
                    {...register("mode_reception")}
                    className="sr-only"
                  />
                  <Monitor className="h-5 w-5 text-sky-600" />
                  <div>
                    <p className="text-sm font-medium">Envoi numérique</p>
                    <p className="text-xs text-gray-500">Fichiers STL / empreinte digitale</p>
                  </div>
                </label>
                <label
                  className={`flex flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 px-4 py-3 transition-colors ${
                    modeReception === "enlevement"
                      ? "border-sky-500 bg-sky-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    value="enlevement"
                    {...register("mode_reception")}
                    className="sr-only"
                  />
                  <Truck className="h-5 w-5 text-teal-600" />
                  <div>
                    <p className="text-sm font-medium">Enlèvement</p>
                    <p className="text-xs text-gray-500">Récupération au cabinet</p>
                  </div>
                </label>
              </div>
            </div>

            {modeReception === "enlevement" && (
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-teal-100 bg-teal-50/50 p-4 sm:grid-cols-2">
                <Input
                  label="Adresse d'enlèvement"
                  placeholder="123 Rue du Cabinet, 1000 Bruxelles"
                  {...register("adresse_enlevement")}
                />
                <Input
                  label="Date d'enlèvement souhaitée"
                  type="date"
                  {...register("date_enlevement")}
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Input
                label="Référence libre"
                placeholder="Ex: Ref cabinet"
                {...register("patient_ref")}
              />
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Priorité
                </label>
                <select
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  {...register("priorite")}
                >
                  <option value="normale">Normale</option>
                  <option value="urgente">Urgente</option>
                  <option value="express">Express</option>
                </select>
              </div>
              <Input
                label="Date souhaitée"
                type="date"
                {...register("date_souhaitee")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">
                Notes pour le laboratoire
              </label>
              <textarea
                className="flex min-h-[80px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                placeholder="Instructions particulières, détails cliniques..."
                {...register("notes_dentiste")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Travaux */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Travaux demandés</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() =>
                append({
                  type_travail: "",
                  dents: "",
                  materiau: "",
                  teinte: "",
                })
              }
            >
              <Plus className="h-4 w-4" />
              Ajouter un travail
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            {fields.map((field, index) => (
              <div
                key={field.id}
                className="relative rounded-lg border border-gray-200 p-4"
              >
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="absolute right-3 top-3 rounded-lg p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Type de travail
                    </label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      {...register(`items.${index}.type_travail`)}
                    >
                      <option value="">Sélectionner...</option>
                      {typesTravauxOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Dents (n°)"
                    placeholder="11, 12, 21"
                    {...register(`items.${index}.dents`)}
                  />
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Matériau
                    </label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      {...register(`items.${index}.materiau`)}
                    >
                      <option value="">Sélectionner...</option>
                      {materiauxOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">
                      Teinte
                    </label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                      {...register(`items.${index}.teinte`)}
                    >
                      <option value="">Sélectionner...</option>
                      {teintesOptions.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <Input
                    label="Notes"
                    placeholder="Détails supplémentaires..."
                    {...register(`items.${index}.notes`)}
                  />
                </div>
              </div>
            ))}
            {errors.items?.message && (
              <p className="text-sm text-red-600">{errors.items.message}</p>
            )}
          </CardContent>
        </Card>

        {/* Fichiers */}
        <Card>
          <CardHeader>
            <CardTitle>Fichiers STL & Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm text-gray-600">
                Glissez vos fichiers ici ou cliquez pour parcourir
              </p>
              <p className="mt-1 text-xs text-gray-400">
                STL, PDF, JPG, PNG - Max 50MB par fichier
              </p>
              <input
                type="file"
                multiple
                accept=".stl,.pdf,.jpg,.jpeg,.png"
                className="mt-4"
                onChange={(e) => {
                  if (e.target.files) {
                    setFiles(Array.from(e.target.files));
                  }
                }}
              />
              {files.length > 0 && (
                <div className="mt-4 space-y-1">
                  {files.map((f, i) => (
                    <p key={i} className="text-sm text-gray-600">
                      {f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Annuler
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Envoyer la commande
          </Button>
        </div>
      </form>
    </div>
  );
}
