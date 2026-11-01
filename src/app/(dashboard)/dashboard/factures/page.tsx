import { redirect } from "next/navigation";

export default async function FacturesPage() {
  redirect("/dashboard/finance");
}