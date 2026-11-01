"use client";

import { useState } from "react";
import { FactureActions } from "./facture-actions";

export type ClientInvoice = {
  id: string; numero: string; statut: string; date_emission: string | null;
  montant_ttc: number; solde_du: number; pdf_storage_path: string | null;
  email_envoye_at: string | null; billit_order_id: number | null; billit_is_sent: boolean;
  commande_numero: string | null;
};

export function FinanceTabs({ invoices, creditNotes, ledger }: {
  invoices: ClientInvoice[]; creditNotes: React.ReactNode; ledger: React.ReactNode;
}) {
  const [tab, setTab] = useState("received");
  const rows = invoices.filter((invoice) => invoice.statut !== "brouillon" && invoice.billit_is_sent && invoice.pdf_storage_path);
  return <div className="space-y-4">
    <div role="tablist" aria-label="Factures et paiements" className="flex flex-wrap gap-1 border-b border-gray-200 pb-2">
      {[['received',`Factures reçues (${rows.length})`],['credits','Avoirs'],['ledger','Relevé']].map(([id,label]) => <button type="button" role="tab" key={id} aria-selected={tab === id} aria-controls={`finance-${id}`} id={`tab-${id}`} onClick={() => setTab(id)} className={`min-h-10 rounded-md px-3 text-sm ${tab === id ? "bg-sky-100 font-medium text-sky-800" : "text-gray-600 hover:bg-gray-100"}`}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`finance-${tab}`} aria-labelledby={`tab-${tab}`}>
      {tab === "credits" ? creditNotes : tab === "ledger" ? ledger : !rows.length ? <p className="py-8 text-center text-sm text-gray-500">Aucune facture Billit reçue sur cette période.</p> :
        <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="pb-3 font-medium">Facture Billit</th><th className="pb-3 font-medium">Montant</th><th className="pb-3 font-medium">Solde</th><th className="pb-3 text-right font-medium">Actions</th></tr></thead><tbody className="divide-y divide-gray-100">{rows.map((invoice) => <tr key={invoice.id}><td className="py-3"><p className="font-medium">{invoice.numero}</p><p className="text-xs text-gray-500">{invoice.commande_numero || "Travail libre"}{invoice.date_emission ? ` · ${new Date(invoice.date_emission).toLocaleDateString("fr-BE")}` : ""}</p></td><td className="py-3 font-medium">{Number(invoice.montant_ttc).toFixed(2)} €</td><td className="py-3">{Number(invoice.solde_du).toFixed(2)} €<p className="text-xs text-gray-500">{invoice.statut === "payee" ? "Payée" : invoice.statut === "partiellement_payee" ? "Paiement partiel" : invoice.statut === "en_retard" ? "En retard" : "Reçue du laboratoire"}</p></td><td className="py-3 text-right"><FactureActions factureId={invoice.id} statut={invoice.statut} pdfAvailable={Boolean(invoice.pdf_storage_path)} emailSent={Boolean(invoice.email_envoye_at)} billitOrderId={invoice.billit_order_id} /></td></tr>)}</tbody></table></div>}
    </div>
  </div>;
}