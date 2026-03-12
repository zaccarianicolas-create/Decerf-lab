"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
    cabinet_nom: z.string().optional(),
    password: z.string().min(6, "Minimum 6 caractères"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirmPassword"],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

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
          <div className="mt-4 rounded-lg bg-amber-50 p-3">
            <p className="text-sm text-amber-700">
              <strong>Note :</strong> Après confirmation de votre email, votre
              compte devra être validé par notre équipe avant de pouvoir accéder
              à la plateforme. Vous serez notifié par email une fois votre compte
              approuvé.
            </p>
          </div>
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
          width={180}
          height={50}
          className="mx-auto mb-1 h-11 w-auto"
        />
        <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400">
          Laboratoire dentaire
        </p>
        <CardTitle className="mt-4 text-2xl">Créer un compte</CardTitle>
        <p className="text-sm text-gray-500">
          Rejoignez DECERF LAB en tant que praticien
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {...register("email")}
          />
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
