import { redirect } from "next/navigation";
import { getActiveSessionUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function SpcOutlooksPage() {
  const session = await getActiveSessionUser();
  if (!session) return null; // proxy guarantees this won't render unauthenticated
  if (!session.enabledFeatures.includes("spc-outlooks")) redirect("/");

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">NWS SPC Outlooks</h1>
        <p className="text-sm text-muted">Coming soon.</p>
      </main>
    </div>
  );
}
