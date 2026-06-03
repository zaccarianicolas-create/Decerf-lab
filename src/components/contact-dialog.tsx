"use client";

import { useEffect, useState } from "react";
import { X, Send, CheckCircle2, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ContactDialog() {
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    nom: "",
    email: "",
    telephone: "",
    sujet: "",
    message: "",
    website: "", // honeypot
  });

  useEffect(() => {
    const openIfHash = () => {
      if (window.location.hash === "#contact") {
        setOpen(true);
      }
    };
    openIfHash();
    window.addEventListener("hashchange", openIfHash);
    return () => window.removeEventListener("hashchange", openIfHash);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    if (window.location.hash === "#contact") {
      history.replaceState(null, "", window.location.pathname);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSending(false);
    if (!res.ok) {
      setError(json.error || "Erreur lors de l'envoi");
      return;
    }
    setSent(true);
    setTimeout(() => {
      setForm({
        nom: "",
        email: "",
        telephone: "",
        sujet: "",
        message: "",
        website: "",
      });
      setSent(false);
      close();
    }, 2500);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Fermer"
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="border-b border-gray-100 bg-gradient-to-br from-sky-50 to-white p-6 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-900">Nous contacter</h2>
          <p className="mt-1 text-sm text-gray-600">
            Une question, un projet ? Notre équipe vous répond sous 24h.
          </p>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-3">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-sky-600" />
              contact@decerf-lab.fr
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-sky-600" />
              +33 1 23 45 67 89
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-sky-600" />
              France
            </div>
          </div>
        </div>

        {sent ? (
          <div className="flex flex-col items-center gap-3 p-12 text-center">
            <CheckCircle2 className="h-14 w-14 text-green-500" />
            <h3 className="text-xl font-semibold text-gray-900">
              Message envoyé !
            </h3>
            <p className="text-sm text-gray-600">
              Merci, nous revenons vers vous rapidement.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-6 sm:p-8">
            {/* Honeypot */}
            <div className="hidden">
              <label>
                Ne pas remplir
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) =>
                    setForm({ ...form, website: e.target.value })
                  }
                />
              </label>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Nom *"
                value={form.nom}
                onChange={(e) => setForm({ ...form, nom: e.target.value })}
                required
              />
              <Input
                label="Email *"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
              <Input
                label="Téléphone"
                value={form.telephone}
                onChange={(e) =>
                  setForm({ ...form, telephone: e.target.value })
                }
              />
              <Input
                label="Sujet"
                value={form.sujet}
                onChange={(e) => setForm({ ...form, sujet: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Message *
              </label>
              <textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={5}
                required
                minLength={10}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="Décrivez votre demande..."
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <p className="text-xs text-gray-500">
                Vos données sont traitées conformément au RGPD.
              </p>
              <Button
                type="submit"
                isLoading={sending}
                className="gap-2 bg-sky-600 hover:bg-sky-700"
              >
                <Send className="h-4 w-4" />
                Envoyer
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
