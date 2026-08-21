import { RecoverPasswordForm } from "@/components/RecoverPasswordForm";

export default async function RecoverPage({ params }: PageProps<"/recover/[token]">) {
  const { token } = await params;

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <RecoverPasswordForm token={token} />
    </div>
  );
}
