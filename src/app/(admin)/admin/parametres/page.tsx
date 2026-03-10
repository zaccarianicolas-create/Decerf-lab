import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function AdminParametresPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-sm text-gray-500">
          Configuration du laboratoire
        </p>
      </div>
      <Card>
        <CardContent className="py-12 text-center">
          <Settings className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-4 text-gray-500">
            La page de paramètres sera implémentée prochainement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
