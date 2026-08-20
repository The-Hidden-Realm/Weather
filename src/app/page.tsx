import { getSessionUser } from "@/lib/auth";
import { getDb, type LocationRow } from "@/lib/db";
import { TopNav } from "@/components/TopNav";
import { Dashboard } from "@/components/Dashboard";

export default async function Home() {
  const session = await getSessionUser();
  if (!session) return null; // middleware guarantees this won't render unauthenticated

  const locations = getDb()
    .prepare("SELECT * FROM locations WHERE user_id = ? ORDER BY is_default DESC, created_at ASC")
    .all(session.userId) as LocationRow[];

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <Dashboard initialLocations={locations} />
      </main>
    </div>
  );
}
