import { getActiveSessionUser, findUserById } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const session = await getActiveSessionUser();
  if (!session) return null; // proxy guarantees this won't render unauthenticated

  const user = findUserById(session.userId);

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Settings</h1>
        <p className="mb-6 text-sm text-muted">Manage your account.</p>
        <SettingsForm session={session} firstName={user?.first_name ?? ""} email={user?.email ?? ""} />
      </main>
    </div>
  );
}
