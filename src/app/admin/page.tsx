import { getActiveSessionUser, listAllUsers } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await getActiveSessionUser();
  if (!session || (session.role !== "admin" && session.role !== "moderator")) return null; // proxy guarantees this

  // A moderator's AdminPanel only ever renders the Cameras tab, so it never
  // needs the full user list — skip the query entirely for them.
  const users = session.role === "admin" ? listAllUsers() : [];

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AdminPanel initialUsers={users} currentUserId={session.userId} role={session.role} />
      </main>
    </div>
  );
}
