"use client";

import { useState } from "react";
import { Send, CheckCircle2, Mail, Phone, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ContactPage() {
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
    setForm({
      nom: "",
      email: "",
      telephone: "",
      sujet: "",
      message: "",
      website: "",
    });
  };

  return (
    <div className="bg-slate-50">
      {/* Hero */}
      <section className="bg-gradient-to-br from-sky-50 to-white">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Nous contacter
            </h1>
            <p className="mt-4 text-lg leading-relaxed text-slate-600">
              Une question, un projet de prothèse ou une demande d&apos;information ?
              Notre équipe vous répond sous 24h ouvrées.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          {/* Coordonnées */}
          <div className="space-y-6 lg:col-span-1">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Email</h3>
                <a
                  href="mailto:contact@decerf-lab.be"
                  className="text-sm text-slate-600 transition-colors hover:text-sky-600"
                >
                  contact@decerf-lab.be
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <MapPin className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Adresse</h3>
                <p className="text-sm text-slate-600">
                  Rue des Claveaux 1
                  <br />
                  4560 Clavier
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Téléphone</h3>
                <p className="text-sm text-slate-600">Sur demande par email</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Horaires</h3>
                <p className="text-sm text-slate-600">
                  Lun – Ven : 8h30 – 17h30
                </p>
              </div>
            </div>
          </div>

          {/* Formulaire */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              {sent ? (
                <div className="flex flex-col items-center gap-3 py-12 text-center">
                  <CheckCircle2 className="h-14 w-14 text-green-500" />
                  <h3 className="text-xl font-semibold text-slate-900">
                    Message envoyé !
                  </h3>
                  <p className="text-sm text-slate-600">
                    Merci, nous revenons vers vous rapidement.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => setSent(false)}
                  >
                    Envoyer un autre message
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
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
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
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
                      onChange={(e) =>
                        setForm({ ...form, sujet: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Message *
                    </label>
                    <textarea
                      value={form.message}
                      onChange={(e) =>
                        setForm({ ...form, message: e.target.value })
                      }
                      rows={6}
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
        </div>
      </section>
    </div>
  );
}
