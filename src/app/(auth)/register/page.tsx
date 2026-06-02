"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const registerSchema = z
  .object({
    nom: z.string().min(2, "Minimum 2 caractères"),
    prenom: z.string().min(2, "Minimum 2 caractères"),
    email: z.string().email("Email invalide"),
    telephone: z.string().optional(),
    type_compte_client: z.enum(["dentiste_independant", "clinique"]),
    cabinet_nom: z.string().optional(),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitationError, setInvitationError] = useState<string | null>(null);
  const [loadingInvitation, setLoadingInvitation] = useState(false);

  const invitationToken = searchParams.get("invitation");
  const hasValidInvitation = Boolean(invitationToken) && !invitationError;

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      type_compte_client: "dentiste_independant",
    },
  });

  const typeCompte = watch("type_compte_client");

  useEffect(() => {
    if (!invitationToken) return;

    const loadInvitation = async () => {
      setLoadingInvitation(true);
      setInvitationError(null);

      try {
        const response = await fetch(
          `/api/auth/invitations?token=${encodeURIComponent(invitationToken)}`
        );
        const payload = (await response.json()) as {
          invitation?: {
            email: string;
            nom: string | null;
            prenom: string | null;
            telephone: string | null;
            cabinet_nom: string | null;
            type_compte_client: "dentiste_independant" | "clinique";
          };
          error?: string;
        };

        if (!response.ok || !payload.invitation) {
          setInvitationError(payload.error || "Invitation invalide");
          return;
        }

        setValue("email", payload.invitation.email || "");
        setValue("nom", payload.invitation.nom || "");
        setValue("prenom", payload.invitation.prenom || "");
        setValue("telephone", payload.invitation.telephone || "");
        setValue("cabinet_nom", payload.invitation.cabinet_nom || "");
        setValue("type_compte_client", payload.invitation.type_compte_client);
      } catch {
        setInvitationError("Impossible de vérifier l'invitation");
      } finally {
        setLoadingInvitation(false);
      }
    };

    loadInvitation();
  }, [invitationToken, setValue]);

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          nom: data.nom,
          prenom: data.prenom,
          telephone: data.telephone || null,
          cabinet_nom: data.cabinet_nom || null,
          type_compte_client: data.type_compte_client,
          onboarding_source: invitationToken
            ? "invitation_labo"
            : "inscription_site",
          invitation_token: hasValidInvitation ? invitationToken : null,
          role: "dentiste",
        },
      },
    });

    if (authError) {
      setError(authError.message);
      return;
    }

    setSuccess(true);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl">✓</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Inscription enregistrée !
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Un email de confirmation vous a été envoyé. Veuillez vérifier votre
            boîte mail et cliquer sur le lien de confirmation.
          </p>
          {hasValidInvitation && (
            <div className="mt-4 rounded-lg bg-green-50 p-3">
              <p className="text-sm text-green-700">
                Votre compte provient d&apos;une invitation du laboratoire.
                Après confirmation email, votre accès sera disponible sans
                attente supplémentaire.
              </p>
            </div>
          )}
          {!hasValidInvitation && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3">
              <p className="text-sm text-amber-700">
                <strong>Note :</strong> Après confirmation de votre email,
                votre compte devra être validé par notre équipe avant de
                pouvoir accéder à la plateforme. Vous serez notifié par email
                une fois votre compte approuvé.
              </p>
            </div>
          )}
          <Link href="/login" className="mt-6 block">
            <Button className="w-full">Se connecter</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <Image
          src="/images/logod.png"
          alt="DECERF LAB"
          width={200}
          height={55}
          className="mx-auto mb-0.5 h-14 w-auto"
        />
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-400">
          Laboratoire dentaire
        </p>
        <CardTitle className="mt-4 text-2xl">Créer un compte</CardTitle>
        <p className="text-sm text-gray-500">
          Rejoignez DECERF LAB en tant que praticien
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {loadingInvitation && (
            <div className="rounded-lg bg-sky-50 p-3 text-sm text-sky-700">
              Vérification de votre invitation...
            </div>
          )}
          {invitationError && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {invitationError}
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Prénom"
              placeholder="Jean"
              error={errors.prenom?.message}
              {...register("prenom")}
            />
            <Input
              label="Nom"
              placeholder="Dupont"
              error={errors.nom?.message}
              {...register("nom")}
            />
          </div>
          <Input
            label="Email professionnel"
            type="email"
            placeholder="docteur@cabinet.fr"
            error={errors.email?.message}
            disabled={hasValidInvitation}
            {...register("email")}
          />

          <div className="rounded-lg border border-gray-200 p-4">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Type de compte
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() =>
                  setValue("type_compte_client", "dentiste_independant")
                }
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                  typeCompte === "dentiste_independant"
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="font-medium">Dentiste indépendant</span>
              </button>
              <button
                type="button"
                onClick={() => setValue("type_compte_client", "clinique")}
                className={`flex-1 rounded-lg border-2 px-4 py-3 text-left text-sm transition-colors ${
                  typeCompte === "clinique"
                    ? "border-sky-500 bg-sky-50 text-sky-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <span className="font-medium">Clinique</span>
              </button>
            </div>
          </div>

          <input type="hidden" {...register("type_compte_client")} />
          <Input
            label="Téléphone"
            type="tel"
            placeholder="06 12 34 56 78"
            error={errors.telephone?.message}
            {...register("telephone")}
          />
          <Input
            label="Nom du cabinet (optionnel)"
            placeholder="Cabinet dentaire du Parc"
            error={errors.cabinet_nom?.message}
            {...register("cabinet_nom")}
          />
          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            error={errors.password?.message}
            {...register("password")}
          />
          <Input
            label="Confirmer le mot de passe"
            type="password"
            placeholder="••••••••"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
          <Button type="submit" className="w-full" isLoading={isSubmitting}>
            Créer mon compte
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-gray-500">
          Déjà inscrit ?{" "}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Se connecter
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
