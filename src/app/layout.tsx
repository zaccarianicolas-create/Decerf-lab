import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "DECERF LAB | Laboratoire dentaire et orthodontique",
    template: "%s | DECERF LAB",
  },
  description:
    "Laboratoire dentaire et orthodontique DECERF LAB. Prothèses dentaires de haute qualité, technologie de pointe et savoir-faire artisanal.",
  keywords: [
    "laboratoire dentaire",
    "prothèse dentaire",
    "orthodontie",
    "couronne",
    "bridge",
    "implant",
    "DECERF LAB",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
