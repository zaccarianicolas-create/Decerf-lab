"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileDown, Plus, X } from "lucide-react";

type Protocole = {
  id: string;
  titre: string;
  type_protocole?: string | null;
  type_travail?: string | null;
  version?: number | null;
  template_sections?: Record<string, boolean> | null;
};

type Instance = {
  id: string;
  titre: string;
  type_protocole: string;
  type_travail: string | null;
  version: number;
  statut: string;
  created_at: string;
  sections: Record<string, unknown>;
};

const DEFAULT_SECTIONS: Record<string, boolean> = {
  entete: true,
  contexte: true,
  checklist: true,
  materiaux: true,
  tracabilite: true,
  notes: true,
  signature: true,
};

export function ProtocoleInstancePanel({
  commandeId,
  patientId,
  dentisteId,
  items,
  protocoles,
  instances,
}: {
  commandeId: string;
  patientId?: string | null;
  dentisteId?: string | null;
  items: any[];
  protocoles: Protocole[];
  instances: Instance[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("");
  const [creating, setCreating] = useState(false);
  const [overrideSections, setOverrideSections] = useState<Record<string, boolean>>({
    ...DEFAULT_SECTIONS,
  });

  const typesTravail = useMemo(() => {
    const s = new Set<string>();
    for (const it of items || []) {
      if (it?.type_travail) s.add(String(it.type_travail));
    }
    return Array.from(s);
  }, [items]);

  const suggested = useMemo(() => {
    if (!typesTravail.length) return protocoles;
    return protocoles.filter(
      (p) => !p.type_travail || typesTravail.includes(String(p.type_travail))
    );
  }, [protocoles, typesTravail]);

  const onSelect = (id: string) => {
    setSelected(id);
    const proto = protocoles.find((p) => p.id === id);
    setOverrideSections({
      ...DEFAULT_SECTIONS,
      ...(proto?.template_sections || {}),
    });
  };

  const createInstance = async () => {
    if (!selected) return;
    setCreating(true);
    const res = await fetch("/api/admin/protocoles/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        protocole_id: selected,
        commande_id: commandeId,
        patient_id: patientId || null,
        dentiste_id: dentisteId || null,
        sections: overrideSections,
      }),
    });
    setCreating(false);
    if (res.ok) {
      setOpen(false);
      setSelected("");
      router.refresh();
    } else {
      const json = await res.json().catch(() => ({}));
      alert((json as any)?.error || "Erreur création protocole");
    }
  };

  const toggleSection = (key: string, val: boolean) =>
    setOverrideSections((prev) => ({ ...prev, [key]: val }));

  return (
    <Card>
      <CardContent className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Protocoles liés</h3>
          <Button
            size="sm"
            className="gap-1 bg-sky-600 hover:bg-sky-700"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {open ? "Annuler" : "Lier un protocole"}
          </Button>
        </div>

        {open && (
          <div className="mb-4 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Template protocole
                {typesTravail.length > 0 && (
                  <span className="ml-1 text-xs text-sky-600">
                    (filtrés pour : {typesTravail.join(", ")})
                  </span>
                )}
              </label>
              <select
                value={selected}
                onChange={(e) => onSelect(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">— Sélectionner —</option>
                {suggested.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.titre} ·{" "}
                    {(p.type_protocole || "general").replace(/_/g, " ")} ·{" "}
                    {(p.type_travail || "tous").replace(/_/g, " ")} · v
                    {p.version || 1}
                  </option>
                ))}
              </select>
            </div>

            {!!selected && (
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Sections à inclure dans ce protocole
                </p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {Object.entries(overrideSections).map(([k, v]) => (
                    <label
                      key={k}
                      className="flex items-center gap-2 rounded border border-gray-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(v)}
                        onChange={(e) => toggleSection(k, e.target.checked)}
                      />
                      {k}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                onClick={createInstance}
                isLoading={creating}
                disabled={!selected}
                className="bg-sky-600 hover:bg-sky-700"
              >
                Créer l'instance
              </Button>
            </div>
          </div>
        )}

        {instances.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun protocole lié à ce travail.</p>
        ) : (
          <div className="space-y-2">
            {instances.map((inst) => (
              <div
                key={inst.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900">{inst.titre}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    <Badge className="border-sky-200 bg-sky-50 text-sky-700">
                      {inst.type_protocole.replace(/_/g, " ")}
                    </Badge>
                    <Badge className="border-indigo-200 bg-indigo-50 text-indigo-700">
                      {(inst.type_travail || "tous").replace(/_/g, " ")}
                    </Badge>
                    <Badge className="border-gray-200 bg-gray-50 text-gray-700">
                      v{inst.version}
                    </Badge>
                    <Badge className="border-gray-200 bg-white text-gray-700">
                      {inst.statut}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {new Date(inst.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>
                <a
                  href={`/api/admin/protocoles/instances/${inst.id}/pdf`}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  Export PDF
                </a>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
