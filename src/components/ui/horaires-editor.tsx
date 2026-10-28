"use client";

import { useRef, useState } from "react";
import { CalendarClock, Check, Copy, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
type Day = { mode: "unset" | "open" | "closed" | "appointment"; start: string; end: string; start2: string; end2: string };
const emptyDay = (): Day => ({ mode: "unset", start: "", end: "", start2: "", end2: "" });

function formatHours(days: Day[]): string {
  if (days.every((day) => day.mode === "unset")) return "";
  return days.map((day, index) => {
    const hours = day.mode === "closed" ? "Fermé" : day.mode === "appointment" ? "Sur rendez-vous" : day.mode === "unset" ? "Non renseigné" :
      `${day.start} - ${day.end}${day.start2 ? `, ${day.start2} - ${day.end2}` : ""}`;
    return `${DAYS[index]} : ${hours}`;
  }).join("\n");
}

function parseHours(value: string): Day[] | null {
  if (!value.trim()) return DAYS.map(emptyDay);
  const lines = value.trim().split("\n");
  if (lines.length !== DAYS.length) return null;
  const result: Day[] = [];
  for (const [index, name] of DAYS.entries()) {
    if (!lines[index].startsWith(`${name} : `)) return null;
    const text = lines[index].slice(name.length + 3);
    if (["Non renseigné", "Fermé", "Sur rendez-vous"].includes(text)) {
      result.push({ ...emptyDay(), mode: text === "Fermé" ? "closed" : text === "Sur rendez-vous" ? "appointment" : "unset" });
      continue;
    }
    const match = text.match(/^(\d{2}:\d{2}) - (\d{2}:\d{2})(?:, (\d{2}:\d{2}) - (\d{2}:\d{2}))?$/);
    if (!match) return null;
    result.push({ mode: "open", start: match[1], end: match[2], start2: match[3] ?? "", end2: match[4] ?? "" });
  }
  return result;
}

export function HorairesEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [days, setDays] = useState<Day[]>(DAYS.map(emptyDay));
  const [mode, setMode] = useState<"grid" | "text">("grid");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  const open = () => {
    const parsed = parseHours(value);
    setDays(parsed ?? DAYS.map(emptyDay));
    setMode(parsed ? "grid" : "text");
    setText(value);
    setError("");
    dialog.current?.showModal();
  };
  const updateDay = (index: number, patch: Partial<Day>) => {
    setDays((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, ...patch } : day));
    setError("");
  };
  const apply = () => {
    if (mode === "text") {
      onChange(text.trim());
      dialog.current?.close();
      return;
    }
    const invalid = days.findIndex((day) => day.mode === "open" && (
      !day.start || !day.end || day.start >= day.end ||
      ((day.start2 || day.end2) && (!day.start2 || !day.end2 || day.start2 >= day.end2 || day.start2 < day.end))
    ));
    if (invalid !== -1) {
      setError(`${DAYS[invalid]} : complétez les créneaux avec une fin après le début, sans chevauchement.`);
      return;
    }
    onChange(formatHours(days));
    dialog.current?.close();
  };

  return (
    <div>
      <p className="mb-1 text-sm font-medium text-gray-700">Horaires</p>
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-gray-300 p-3">
        <p className="min-w-0 whitespace-pre-line break-words text-sm text-gray-600">
          {value || "Non renseignés"}
        </p>
        <Button type="button" variant="outline" onClick={open}>
          <CalendarClock className="mr-2 h-4 w-4" /> Modifier les horaires
        </Button>
      </div>
      <dialog ref={dialog} aria-labelledby="horaires-title" className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl overflow-y-auto rounded-lg border border-gray-200 bg-white p-0 text-gray-900 shadow-xl backdrop:bg-black/40">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 id="horaires-title" className="text-lg font-semibold">Horaires du laboratoire</h2>
          <button type="button" onClick={() => dialog.current?.close()} aria-label="Fermer" title="Fermer" className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div className="inline-flex rounded-md border border-gray-200 p-1" role="group" aria-label="Format des horaires">
            {([ ["grid", "Grille hebdomadaire"], ["text", "Texte libre"] ] as const).map(([key, label]) => (
              <button key={key} type="button" aria-pressed={mode === key} onClick={() => {
                if (key === mode) return;
                if (key === "text") setText(formatHours(days));
                else {
                  const parsed = parseHours(text);
                  if (!parsed) {
                    setError("Ce texte personnalisé ne peut pas être converti en grille. Conservez le texte libre ou videz-le pour créer une grille.");
                    return;
                  }
                  setDays(parsed);
                }
                setMode(key);
                setError("");
              }} className={`rounded px-3 py-2 text-sm ${mode === key ? "bg-sky-100 font-medium text-sky-800" : "text-gray-600"}`}>
                {label}
              </button>
            ))}
          </div>
          {mode === "text" ? (
            <textarea aria-label="Horaires en texte libre" value={text} onChange={(event) => setText(event.target.value)} rows={8} className="block w-full rounded-md border border-gray-300 p-3 text-sm" />
          ) : (
            <div className="divide-y divide-gray-200 border-y border-gray-200">
              {days.map((day, index) => (
                <div key={DAYS[index]} className="grid grid-cols-1 gap-3 py-3 sm:grid-cols-[7rem_1fr]">
                  <div className="flex items-center justify-between gap-2 sm:block">
                    <p className="text-sm font-semibold">{DAYS[index]}</p>
                    {index === 0 && (
                      <button type="button" title="Copier le lundi du mardi au vendredi" aria-label="Copier le lundi du mardi au vendredi" onClick={() => setDays((current) => current.map((entry, dayIndex) => dayIndex > 0 && dayIndex < 5 ? { ...current[0] } : entry))} className="mt-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-sky-700 hover:bg-sky-50">
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <div className="min-w-0 space-y-2">
                    <select aria-label={`${DAYS[index]} : ouverture`} value={day.mode} onChange={(event) => updateDay(index, { mode: event.target.value as Day["mode"] })} className="w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm">
                      <option value="unset">Non renseigné</option>
                      <option value="open">Ouvert</option>
                      <option value="closed">Fermé</option>
                      <option value="appointment">Sur rendez-vous</option>
                    </select>
                    {day.mode === "open" && (
                      <div className="grid grid-cols-2 gap-2">
                        {([ ["start", "Ouverture"], ["end", "Fermeture"], ["start2", "Réouverture (facultatif)"], ["end2", "Fermeture (2e créneau)"] ] as const).map(([field, label]) => (
                          <label key={field} className="min-w-0 text-xs text-gray-500">
                            {label}
                            <input type="time" aria-label={`${DAYS[index]} : ${label}`} value={day[field]} onChange={(event) => updateDay(index, { [field]: event.target.value })} className="mt-1 block w-full min-w-0 rounded-md border border-gray-300 px-2 py-2 text-sm text-gray-900" />
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
        <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 border-t border-gray-200 bg-white p-4">
          <Button type="button" variant="outline" onClick={() => dialog.current?.close()}>Annuler</Button>
          <Button type="button" onClick={apply}><Check className="mr-2 h-4 w-4" /> Appliquer</Button>
        </div>
      </dialog>
    </div>
  );
}