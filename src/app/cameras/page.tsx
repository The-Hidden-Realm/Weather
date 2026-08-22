import { notFound } from "next/navigation";
import { getActiveSessionUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { CameraDashboard } from "@/components/CameraDashboard";

export default async function CamerasPage() {
  const session = await getActiveSessionUser();
  if (!session) return null; // proxy guarantees this won't render unauthenticated
  if (!session.enabledFeatures.includes("cameras")) notFound();

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Cameras</h1>
        <p className="mb-6 text-sm text-muted">Pick a camera for each tile — your layout is saved to your account.</p>
        <CameraDashboard isAdmin={session.role === "admin"} />
      </main>
    </div>
  );
}
