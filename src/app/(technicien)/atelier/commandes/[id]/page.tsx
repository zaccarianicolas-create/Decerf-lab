import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Paperclip } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function firstRelation<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function TechnicienCommandeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role, actif, actif_collaborateur")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "technicien" || !profile.actif || !profile.actif_collaborateur) {
    redirect(profile?.role === "admin" ? "/admin" : "/dashboard");
  }

  const { data: assignment } = await admin
    .from("commande_assignations")
    .select("id, role")
    .eq("commande_id", id)
    .eq("technicien_id", user.id)
    .maybeSingle();
  if (!assignment) notFound();

  const [{ data: order }, { data: files }] = await Promise.all([
    admin
      .from("commandes")
      .select("id, numero, statut, priorite, date_livraison, patient_ref, notes_dentiste, patient:patients(prenom, nom, reference), items:commande_items(id, type_travail, item_label, description, quantite, dents, materiau, teinte, notes, service_labo_id, options_selectionnees, service:services_labo(nom))")
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("fichiers")
      .select("id, nom_original, type_mime, storage_bucket, storage_path, created_at")
      .eq("commande_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!order) notFound();

  const selectedOptionIds = [...new Set((order.items ?? []).flatMap((item) => item.options_selectionnees ?? []))];
  const { data: options } = selectedOptionIds.length
    ? await admin.from("service_options").select("id, nom").in("id", selectedOptionIds)
    : { data: [] as { id: string; nom: string }[] };
  const optionsById = new Map((options ?? []).map((option) => [option.id, option.nom]));

  const fileLinks = await Promise.all((files ?? []).map(async (file) => {
    const { data } = await admin.storage
      .from(file.storage_bucket || "fichiers-stl")
      .createSignedUrl(file.storage_path, 60 * 60);
    return { ...file, signedUrl: data?.signedUrl ?? null };
  }));

  const patient = firstRelation(order.patient);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/atelier" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="h-4 w-4" /> Retour à l’atelier
      </Link>
      <header>
        <h1 className="text-2xl font-semibold text-gray-900">Commande {order.numero}</h1>
        <p className="mt-1 text-sm text-gray-500">Statut : {order.statut.replace(/_/g, " ")} · rôle : {assignment.role}</p>
      </header>

      <Card>
        <CardHeader><CardTitle>Dentiste et patient</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {patient && <p><span className="font-medium">Patient :</span> {patient.prenom} {patient.nom} · {patient.reference}</p>}
          {order.patient_ref && <p><span className="font-medium">Référence :</span> {order.patient_ref}</p>}
          {order.date_livraison && <p><span className="font-medium">Échéance :</span> {new Date(order.date_livraison).toLocaleDateString("fr-FR")}</p>}
          {order.notes_dentiste && <p className="whitespace-pre-wrap"><span className="font-medium">Notes :</span> {order.notes_dentiste}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Travaux demandés</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(order.items ?? []).map((item) => {
            const service = firstRelation(item.service);
            const optionIds = Array.isArray(item.options_selectionnees)
              ? (item.options_selectionnees as unknown[]).filter((optionId): optionId is string => typeof optionId === "string")
              : [];
            const selectedOptions = optionIds.map((optionId) => optionsById.get(optionId)).filter(Boolean);
            return (
              <article key={item.id} className="rounded-md border border-gray-200 p-4">
                <h2 className="font-medium text-gray-900">{service?.nom || item.item_label || item.type_travail.replace(/_/g, " ")}</h2>
                {item.description && <p className="mt-1 text-sm text-gray-600">{item.description}</p>}
                <dl className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
                  <div><dt className="inline font-medium">Quantité : </dt><dd className="inline">{item.quantite}</dd></div>
                  {item.dents?.length ? <div><dt className="inline font-medium">Dents : </dt><dd className="inline">{item.dents.join(", ")}</dd></div> : null}
                  {item.materiau && <div><dt className="inline font-medium">Matériau : </dt><dd className="inline">{item.materiau.replace(/_/g, " ")}</dd></div>}
                  {item.teinte && <div><dt className="inline font-medium">Teinte : </dt><dd className="inline">{item.teinte}</dd></div>}
                  {selectedOptions.length > 0 && <div><dt className="inline font-medium">Options : </dt><dd className="inline">{selectedOptions.join(", ")}</dd></div>}
                  {item.notes && <div className="sm:col-span-2"><dt className="inline font-medium">Notes : </dt><dd className="inline">{item.notes}</dd></div>}
                </dl>
              </article>
            );
          })}
        </CardContent>
      </Card>

      {fileLinks.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pièces jointes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {fileLinks.map((file) => (
              <div key={file.id} className="flex items-center gap-2 text-sm">
                <Paperclip className="h-4 w-4 text-gray-400" />
                {file.signedUrl
                  ? <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" className="text-sky-700 hover:underline">{file.nom_original}</a>
                  : <span className="text-gray-500">{file.nom_original} (indisponible)</span>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
