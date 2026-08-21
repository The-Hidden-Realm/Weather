import { getActiveSessionUser, listAllUsers } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { AdminPanel } from "@/components/AdminPanel";

export default async function AdminPage() {
  const session = await getActiveSessionUser();
  if (!session || session.role !== "admin") return null; // proxy guarantees this

  const users = listAllUsers();

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <AdminPanel initialUsers={users} currentUserId={session.userId} />
      </main>
    </div>
  );
}
