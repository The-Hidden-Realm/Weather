import { ErrorPageContent } from "@/components/ErrorPageContent";

export default function AccessDeniedPage() {
  return <ErrorPageContent title="Access denied" message="You don't have permission to view this page." />;
}
