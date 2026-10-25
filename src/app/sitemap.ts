import type { MetadataRoute } from "next";
import { getParametresLabo, safeHttpsUrl } from "@/lib/parametres-labo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const params = await getParametresLabo();
  const origin = safeHttpsUrl(params.site_web) || "https://www.decerf-lab.be";
  const pages: { path: string; changeFrequency: "weekly" | "monthly" | "yearly"; priority: number }[] = [
    { path: "/", changeFrequency: "weekly", priority: 1 },
    { path: "/contact", changeFrequency: "monthly", priority: 0.8 },
    { path: "/mentions-legales", changeFrequency: "yearly", priority: 0.2 },
    { path: "/conditions-generales", changeFrequency: "yearly", priority: 0.2 },
    { path: "/conditions-utilisation", changeFrequency: "yearly", priority: 0.2 },
    { path: "/politique-confidentialite", changeFrequency: "yearly", priority: 0.2 },
    { path: "/politique-cookies", changeFrequency: "yearly", priority: 0.2 },
    { path: "/dpa-annexe", changeFrequency: "yearly", priority: 0.2 },
  ];

  return pages.map((page) => ({
    url: new URL(page.path, origin).toString(),
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}