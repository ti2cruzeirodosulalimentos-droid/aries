import { createFileRoute, Outlet, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";
import { PermissionsProvider } from "@/lib/permissions";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: ProtectedLayout,
});

function ProtectedLayout() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  return (
    <PermissionsProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </PermissionsProvider>
  );
}
