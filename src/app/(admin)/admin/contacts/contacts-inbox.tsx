"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Check, RotateCcw, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export type ContactRequest = {
  id: string; nom: string; email: string; telephone: string | null; sujet: string | null;
  message: string; traite: boolean; created_at: string; read_at: string | null; traite_at: string | null;
};

export function ContactsInbox({ initial, initialFilter = "pending" }: { initial: ContactRequest[]; initialFilter?: string }) {
  const router = useRouter();
  const [contacts,setContacts] = useState(initial);
  const [filter,setFilter] = useState(initialFilter);
  const [activeId,setActiveId] = useState<string | null>(null);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState<string | null>(null);
  const active = contacts.find(contact=>contact.id===activeId);
  useEffect(()=>{
    const supabase=createClient();
    let mounted=true;
    const load=async()=>{
      const {data,error}=await supabase.from("contact_messages").select("id, nom, email, telephone, sujet, message, traite, created_at, read_at, traite_at").order("created_at",{ascending:false}).limit(500);
      if(mounted && !error) setContacts(data ?? []);
    };
    const channel=supabase.channel("admin-contact-inbox").on("postgres_changes",{event:"*",schema:"public",table:"contact_messages"},()=>{void load();}).subscribe();
    window.addEventListener("focus",load);
    const timer=window.setInterval(load,30000);
    return()=>{mounted=false;window.removeEventListener("focus",load);window.clearInterval(timer);void supabase.removeChannel(channel);};
  },[]);
  useEffect(()=>{
    if(!active || active.read_at || active.traite)return;
    const supabase=createClient();
    let pending=false;
    let mounted=true;
    const markRead=async()=>{
      if(pending || document.visibilityState!=="visible" || !document.hasFocus())return;
      pending=true;
      const {data,error}=await supabase.rpc("admin_contact_action",{p_contact_id:active.id,p_action:"lire"});
      if(mounted){
        if(error)setError("Impossible de confirmer la lecture. Réessaie après rechargement.");
        else {setContacts(current=>current.map(contact=>contact.id===active.id?{...contact,read_at:data.read_at}:contact));router.refresh();}
      }
      pending=false;
    };
    void markRead();
    window.addEventListener("focus",markRead);document.addEventListener("visibilitychange",markRead);
    return()=>{mounted=false;window.removeEventListener("focus",markRead);document.removeEventListener("visibilitychange",markRead);};
  },[active,router]);
  const changeStatus=async(action:"traiter"|"reouvrir")=>{
    if(!active)return;
    setBusy(true);setError(null);
    const {data,error}=await createClient().rpc("admin_contact_action",{p_contact_id:active.id,p_action:action});
    if(error)setError(error.message);
    else {setContacts(current=>current.map(contact=>contact.id===active.id?{...contact,...data}:contact));router.refresh();}
    setBusy(false);
  };
  const unread=contacts.filter(contact=>!contact.read_at&&!contact.traite).length;
  const pending=contacts.filter(contact=>!contact.traite).length;
  const treated=contacts.filter(contact=>contact.traite).length;
  const visible=contacts.filter(contact=>filter==="unread"?!contact.read_at&&!contact.traite:filter==="pending"?!contact.traite:filter==="treated"?contact.traite:true);
  return <div className="space-y-5">
    <header><h1 className="text-2xl font-bold text-gray-900">Demandes de contact</h1><p className="mt-1 text-sm text-gray-500">Messages reçus depuis le formulaire du site.</p></header>
    <div className="flex flex-wrap gap-1 border-b border-gray-200 pb-2" role="tablist" aria-label="État des demandes">{[["unread",`Non lues (${unread})`],["pending",`À traiter (${pending})`],["treated",`Traitées (${treated})`],["all",`Toutes (${contacts.length})`]].map(([id,label])=><button type="button" role="tab" key={id} aria-selected={filter===id} onClick={()=>setFilter(id)} className={`min-h-10 rounded-md px-3 text-sm ${filter===id?"bg-sky-100 font-medium text-sky-800":"text-gray-600 hover:bg-gray-100"}`}>{label}</button>)}</div>
    {error&&<p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid min-h-[420px] gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
      <div className={`divide-y divide-gray-200 ${active?"hidden lg:block":""}`}>
        {!visible.length&&<p className="py-8 text-sm text-gray-500">Aucune demande dans cette vue.</p>}
        {visible.map(contact=><button key={contact.id} type="button" onClick={()=>{setActiveId(contact.id);setError(null);}} className={`w-full rounded-md px-3 py-4 text-left ${activeId===contact.id?"bg-sky-50":"hover:bg-gray-50"}`} aria-label={`Ouvrir la demande de ${contact.nom}`}><div className="flex items-start justify-between gap-2"><p className="min-w-0 break-words text-sm font-semibold">{contact.nom}</p>{!contact.read_at&&!contact.traite&&<span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-xs text-sky-800">Non lue</span>}</div><p className="mt-1 truncate text-sm text-gray-600">{contact.sujet||"Sans objet"}</p><p className="mt-1 text-xs text-gray-500">{new Date(contact.created_at).toLocaleDateString("fr-BE")} · {contact.traite?"Traitée":"À traiter"}</p></button>)}
      </div>
      <section className="min-w-0" aria-label="Détail de la demande">{!active?<p className="py-8 text-sm text-gray-500">Sélectionne une demande.</p>:<div className="space-y-4">
        <button type="button" onClick={()=>setActiveId(null)} className="inline-flex min-h-9 items-center gap-2 text-sm text-gray-600 lg:hidden"><ArrowLeft className="h-4 w-4" />Retour aux demandes</button>
        <div className="border-b border-gray-200 pb-4"><h2 className="break-words text-lg font-semibold">{active.sujet||"Demande de contact"}</h2><p className="mt-2 break-words text-sm">{active.nom}</p><a className="break-all text-sm text-sky-700" href={`mailto:${encodeURIComponent(active.email)}`}>{active.email}</a>{active.telephone&&<p><a className="text-sm text-gray-600" href={`tel:${active.telephone.replace(/[^+0-9]/g,"")}`}>{active.telephone}</a></p>}<p className="mt-2 text-xs text-gray-500">Reçue le {new Date(active.created_at).toLocaleString("fr-BE")} · {active.traite?"Traitée":active.read_at?"Lue · À traiter":"Non lue · À traiter"}</p>{active.read_at&&<p className="mt-1 text-xs text-gray-500">Lecture enregistrée le {new Date(active.read_at).toLocaleString("fr-BE")}</p>}</div>
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-700">{active.message}</p>
        <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4"><a className="inline-flex min-h-10 items-center gap-2 rounded-md border border-gray-300 px-3 text-sm text-gray-700" href={`mailto:${encodeURIComponent(active.email)}?subject=${encodeURIComponent(`Re: ${active.sujet||"Votre demande à DECERF LAB"}`)}`}><Mail className="h-4 w-4" />Répondre par email</a><button type="button" disabled={busy} onClick={()=>{void changeStatus(active.traite?"reouvrir":"traiter");}} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-sky-600 px-3 text-sm text-white disabled:opacity-40">{active.traite?<RotateCcw className="h-4 w-4" />:<Check className="h-4 w-4" />}{active.traite?"Remettre à traiter":"Marquer comme traitée"}</button></div>
      </div>}</section>
    </div>
  </div>;
}