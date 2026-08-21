import { redirect } from "next/navigation";
import { getActiveSessionUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { SpcOutlooksView } from "@/components/SpcOutlooksView";

export default async function SpcOutlooksPage() {
  const session = await getActiveSessionUser();
  if (!session) return null; // proxy guarantees this won't render unauthenticated
  if (!session.enabledFeatures.includes("spc-outlooks")) redirect("/");

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <SpcOutlooksView
          isAdmin={session.role === "admin"}
          timezoneOverride={session.timezone}
          timeFormat={session.timeFormat}
        />
      </main>
    </div>
  );
}
