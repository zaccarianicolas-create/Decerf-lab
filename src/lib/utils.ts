import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(date));
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(price);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function getInitials(nom: string, prenom: string): string {
  return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
}

export function getStatusColor(statut: string): string {
  const colors: Record<string, string> = {
    brouillon: "bg-gray-100 text-gray-800",
    en_attente: "bg-yellow-100 text-yellow-800",
    acceptee: "bg-blue-100 text-blue-800",
    en_cours: "bg-indigo-100 text-indigo-800",
    controle_qualite: "bg-purple-100 text-purple-800",
    terminee: "bg-green-100 text-green-800",
    expediee: "bg-teal-100 text-teal-800",
    livree: "bg-emerald-100 text-emerald-800",
    annulee: "bg-red-100 text-red-800",
  };
  return colors[statut] || "bg-gray-100 text-gray-800";
}

export function getStatusLabel(statut: string): string {
  const labels: Record<string, string> = {
    brouillon: "Brouillon",
    en_attente: "En attente",
    acceptee: "Acceptée",
    en_cours: "En cours",
    controle_qualite: "Contrôle qualité",
    terminee: "Terminée",
    expediee: "Expédiée",
    livree: "Livrée",
    annulee: "Annulée",
  };
  return labels[statut] || statut;
}
