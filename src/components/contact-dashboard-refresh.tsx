"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function ContactDashboardRefresh() {
  const router=useRouter();
  useEffect(()=>{
    const supabase=createClient();
    const refresh=()=>router.refresh();
    const channel=supabase.channel("admin-contact-dashboard").on("postgres_changes",{event:"*",schema:"public",table:"contact_messages"},refresh).subscribe();
    window.addEventListener("focus",refresh);
    return()=>{window.removeEventListener("focus",refresh);void supabase.removeChannel(channel);};
  },[router]);
  return null;
}