import { getLabMessengerData } from "@/lib/lab-messenger";
import { MessengerAdmin } from "@/app/(admin)/admin/messages/messenger-admin";

export const dynamic = "force-dynamic";

export default async function AtelierMessagesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const isEmbed = params.embed === "1" || (Array.isArray(params.embed) && params.embed.includes("1"));
  const messenger = await getLabMessengerData("technicien");
  return (
    <div className={isEmbed ? "h-full" : ""}>
      {!isEmbed && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
          <p className="text-sm text-gray-500">Dentistes et équipe du laboratoire.</p>
        </div>
      )}
      <MessengerAdmin {...messenger} isEmbed={isEmbed} />
    </div>
  );
}