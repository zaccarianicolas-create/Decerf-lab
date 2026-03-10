import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: conversations } = await supabase
    .from("conversations")
    .select("*, commande:commandes(numero)")
    .eq("dentiste_id", user.id)
    .order("derniere_activite", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">
          Échangez avec le laboratoire
        </p>
      </div>

      {!conversations || conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">
              Aucune conversation pour le moment. Les conversations sont
              créées automatiquement avec vos commandes.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {conversations.map((conv) => (
            <Card key={conv.id} className="cursor-pointer transition-shadow hover:shadow-md">
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-medium text-gray-900">
                    {conv.titre || `Conversation - ${(conv.commande as any)?.numero || "Général"}`}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Dernière activité: {new Date(conv.derniere_activite).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <MessageSquare className="h-5 w-5 text-gray-400" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
