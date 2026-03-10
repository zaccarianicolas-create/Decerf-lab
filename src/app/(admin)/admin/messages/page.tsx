import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function AdminMessagesPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
        <p className="text-sm text-gray-500">
          Conversations avec les praticiens
        </p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            Le système de messagerie admin sera implémenté prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
