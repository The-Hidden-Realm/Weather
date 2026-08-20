import { getActiveSessionUser, listAllUsers } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { AdminUserTable } from "@/components/AdminUserTable";

export default async function AdminPage() {
  const session = await getActiveSessionUser();
  if (!session || session.role !== "admin") return null; // proxy guarantees this

  const users = listAllUsers();

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Users</h1>
        <p className="mb-5 text-sm text-muted">Everyone with an account on this instance.</p>

        <AdminUserTable initialUsers={users} currentUserId={session.userId} />
      </main>
    </div>
  );
}
