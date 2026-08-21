import { redirect } from "next/navigation";
import { getActiveSessionUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";

export default async function StormPredictionPage() {
  const session = await getActiveSessionUser();
  if (!session) return null; // proxy guarantees this won't render unauthenticated
  if (!session.enabledFeatures.includes("storm-prediction")) redirect("/");

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Storm Prediction</h1>
        <p className="text-sm text-muted">Coming soon.</p>
      </main>
    </div>
  );
}
