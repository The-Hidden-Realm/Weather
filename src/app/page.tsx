import { getSessionUser } from "@/lib/auth";
import { getDb, type LocationRow } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { Dashboard } from "@/components/Dashboard";

export default async function Home() {
  const session = await getSessionUser();
  if (!session) return null; // middleware guarantees this won't render unauthenticated

  const location = getDb()
    .prepare("SELECT * FROM locations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1")
    .get(session.userId) as LocationRow | undefined;

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Dashboard initialLocation={location ?? null} isAdmin={session.role === "admin"} />
      </main>
    </div>
  );
}
