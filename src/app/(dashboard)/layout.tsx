import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { ChatFab } from "@/components/messagerie/chat-fab";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardSidebar />
      <main className="pt-14 lg:pl-64 lg:pt-0">
        <div className="px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
      <ChatFab href="/dashboard/messages" />
    </div>
  );
}
