import { WorkspaceLayoutShell } from "@/components/layout/workspace-layout-shell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkspaceLayoutShell workspace="admin">{children}</WorkspaceLayoutShell>;
}
