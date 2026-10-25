import type { MetadataRoute } from "next";

const privatePaths = [
  "/admin/",
  "/dashboard/",
  "/atelier/",
  "/api/",
  "/compte-en-attente",
  "/modifier-mot-de-passe",
];

export default function robots(): MetadataRoute.Robots {
  const publicSearchBots = ["OAI-SearchBot", "PerplexityBot", "Claude-SearchBot"];

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privatePaths },
      ...publicSearchBots.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: privatePaths,
      })),
    ],
    sitemap: "https://www.decerf-lab.be/sitemap.xml",
    host: "https://www.decerf-lab.be",
  };
}