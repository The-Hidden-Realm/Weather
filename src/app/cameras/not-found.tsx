import { ErrorPageContent } from "@/components/ErrorPageContent";

export default function CamerasNotFound() {
  return (
    <ErrorPageContent
      title="Cameras isn't available"
      message="This feature isn't enabled for your account. Ask an admin to turn it on."
    />
  );
}
