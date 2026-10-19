import { WorkspaceLayoutShell } from "@/components/layout/workspace-layout-shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceLayoutShell workspace="dashboard">{children}</WorkspaceLayoutShell>;
}
