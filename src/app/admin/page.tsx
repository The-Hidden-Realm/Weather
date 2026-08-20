import { getSessionUser } from "@/lib/auth";
import { getDb, type UserRow } from "@/lib/db";
import { TopNav } from "@/components/TopNav";

export default async function AdminPage() {
  const session = await getSessionUser();
  if (!session || session.role !== "admin") return null; // middleware guarantees this

  const users = getDb()
    .prepare(
      `SELECT u.id, u.username, u.role, u.created_at,
              (SELECT COUNT(*) FROM locations l WHERE l.user_id = u.id) as location_count
       FROM users u ORDER BY u.created_at ASC`
    )
    .all() as (UserRow & { location_count: number })[];

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Users</h1>
        <p className="mb-5 text-sm text-muted">Everyone with an account on this instance.</p>

        <div className="overflow-hidden rounded-2xl border border-border bg-surface/70">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-medium">Username</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Locations</th>
                <th className="px-4 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 text-foreground">{u.username}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.role === "admin" ? "bg-accent/15 text-accent-2" : "bg-surface-2 text-muted"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">{u.location_count}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(u.created_at + "Z").toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
