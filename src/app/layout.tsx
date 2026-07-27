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
