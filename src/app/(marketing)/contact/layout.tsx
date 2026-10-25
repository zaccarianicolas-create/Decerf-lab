import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact et accès | DECERF LAB",
  description: "Contacter le laboratoire dentaire DECERF LAB à Clavier, Belgique, pour une demande de prothèse, d’orthodontie ou une réparation.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contacter DECERF LAB",
    description: "Coordonnées et formulaire de contact du laboratoire dentaire DECERF LAB.",
    url: "/contact",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}