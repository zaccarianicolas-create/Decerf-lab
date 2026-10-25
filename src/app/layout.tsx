import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { CookieBanner } from "@/components/cookie-banner";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.decerf-lab.be"),
  title: {
    default: "Laboratoire dentaire à Clavier | DECERF LAB",
    template: "%s | DECERF LAB",
  },
  description:
    "Laboratoire dentaire et orthodontique à Clavier, Belgique. Prothèses dentaires et appareils sur mesure, flux numérique et accompagnement des praticiens.",
  keywords: [
    "laboratoire dentaire",
    "prothèse dentaire",
    "orthodontie",
    "couronne",
    "bridge",
    "implant",
    "DECERF LAB",
    "Clavier",
    "Belgique",
  ],
  openGraph: {
    type: "website",
    locale: "fr_BE",
    siteName: "DECERF LAB",
    title: "Laboratoire dentaire à Clavier | DECERF LAB",
    description: "Prothèses dentaires et appareils orthodontiques sur mesure pour les praticiens en Belgique.",
    images: [{ url: "/images/bann%20site.png", alt: "Laboratoire dentaire DECERF LAB" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Laboratoire dentaire à Clavier | DECERF LAB",
    description: "Prothèses dentaires et appareils orthodontiques sur mesure pour les praticiens en Belgique.",
    images: ["/images/bann%20site.png"],
  },
  icons: {
    icon: "/images/favicon.png",
    shortcut: "/images/favicon.png",
    apple: "/images/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
