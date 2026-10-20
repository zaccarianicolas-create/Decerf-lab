import { createAdminClient } from "@/lib/supabase/admin";
import { PartnersCarousel } from "./partners-carousel";

export async function PartnersBand() {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("partenaires")
    .select("id, nom, logo_path, site_url")
    .eq("actif", true)
    .order("ordre", { ascending: true })
    .order("nom", { ascending: true });

  if (error || !data?.length) return null;

  const partners = data.map((partner) => ({
    id: partner.id,
    nom: partner.nom,
    site_url: partner.site_url,
    logo_url: partner.logo_path
      ? partner.logo_path.startsWith("/") || /^https?:\/\//i.test(partner.logo_path)
        ? partner.logo_path
        : admin.storage.from("branding").getPublicUrl(partner.logo_path).data.publicUrl
      : null,
  }));

  return <PartnersCarousel partners={partners} />;
}
