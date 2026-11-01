import { getLabMessengerData } from "@/lib/lab-messenger";
import { MessengerAdmin } from "./messenger-admin";

export const dynamic = "force-dynamic";

export default async function AdminMessagesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const initialOpenNew =
    resolvedSearchParams?.new === "1" ||
    (Array.isArray(resolvedSearchParams?.new) &&
      resolvedSearchParams?.new?.includes("1"));
  const isEmbed =
    resolvedSearchParams?.embed === "1" ||
    (Array.isArray(resolvedSearchParams?.embed) &&
      resolvedSearchParams?.embed?.includes("1"));

  const messenger = await getLabMessengerData("admin");

  return (
    <div className={isEmbed ? "h-full" : ""}>
      {!isEmbed && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Messagerie</h1>
          <p className="text-sm text-gray-500">
            Dentistes et équipe du laboratoire.
          </p>
        </div>
      )}
      <MessengerAdmin
        {...messenger}
        initialActiveId={typeof resolvedSearchParams?.conversation === "string" ? resolvedSearchParams.conversation : undefined}
        initialOpenNew={Boolean(initialOpenNew)}
        isEmbed={Boolean(isEmbed)}
      />
    </div>
  );
}
