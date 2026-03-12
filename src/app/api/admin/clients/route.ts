import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Vérifier que l'utilisateur est admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { nom, prenom, email, telephone, cabinet_nom, avec_compte } = body;

  if (!nom || !prenom || !email) {
    return NextResponse.json(
      { error: "Nom, prénom et email sont requis" },
      { status: 400 }
    );
  }

  try {
    if (avec_compte) {
      // Créer un compte Supabase Auth + profil (invitation par email)
      const { data: authUser, error: authError } =
        await admin.auth.admin.createUser({
          email,
          email_confirm: false,
          user_metadata: { nom, prenom, role: "dentiste" },
        });

      if (authError) {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }

      // Mettre à jour le profil créé par le trigger
      if (authUser.user) {
        await admin
          .from("profiles")
          .update({
            telephone: telephone || null,
            statut_compte: "approuve",
            actif: true,
          })
          .eq("id", authUser.user.id);

        // Créer cabinet si fourni
        if (cabinet_nom) {
          const { data: cabinet } = await admin
            .from("cabinets")
            .insert({ nom: cabinet_nom })
            .select("id")
            .single();
          if (cabinet) {
            await admin
              .from("profiles")
              .update({ cabinet_id: cabinet.id })
              .eq("id", authUser.user.id);
          }
        }

        // Envoyer l'email d'invitation
        await admin.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
      }

      return NextResponse.json({ success: true, type: "avec_compte" });
    } else {
      // Client sans compte plateforme — juste une entrée dans profiles
      // On crée un "faux" user via admin API avec un password aléatoire
      const tempPassword = crypto.randomUUID();
      const { data: authUser, error: authError } =
        await admin.auth.admin.createUser({
          email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: { nom, prenom, role: "dentiste" },
        });

      if (authError) {
        return NextResponse.json(
          { error: authError.message },
          { status: 400 }
        );
      }

      if (authUser.user) {
        await admin
          .from("profiles")
          .update({
            telephone: telephone || null,
            statut_compte: "approuve",
            actif: true,
          })
          .eq("id", authUser.user.id);

        if (cabinet_nom) {
          const { data: cabinet } = await admin
            .from("cabinets")
            .insert({ nom: cabinet_nom })
            .select("id")
            .single();
          if (cabinet) {
            await admin
              .from("profiles")
              .update({ cabinet_id: cabinet.id })
              .eq("id", authUser.user.id);
          }
        }
      }

      return NextResponse.json({ success: true, type: "sans_compte" });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}
