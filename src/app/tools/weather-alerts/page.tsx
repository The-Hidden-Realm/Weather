import { redirect } from "next/navigation";
import { getActiveSessionUser } from "@/lib/auth";
import { TopNav } from "@/components/TopNav";
import { WeatherAlertsSearch } from "@/components/WeatherAlertsSearch";

export default async function WeatherAlertsPage() {
  const session = await getActiveSessionUser();
  if (!session) return null; // proxy guarantees this won't render unauthenticated
  if (!session.enabledFeatures.includes("weather-alerts")) redirect("/");

  return (
    <div className="min-h-dvh">
      <TopNav session={session} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <h1 className="mb-1 text-lg font-semibold text-foreground">Weather Alerts</h1>
        <p className="mb-6 text-sm text-muted">
          Look up active National Weather Service alerts for any location — this doesn&apos;t change the
          alerts shown in the bell above, which always follow your home location.
        </p>
        <WeatherAlertsSearch />
      </main>
    </div>
  );
}
