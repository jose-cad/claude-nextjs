import { Suspense } from "react";
import { ResetPasswordView } from "@/components/auth/ResetPasswordView";

async function ResetPassword({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  const { erro } = await searchParams;
  return <ResetPasswordView linkError={erro === "link"} />;
}

export default function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  return (
    <Suspense fallback={null}>
      <ResetPassword searchParams={searchParams} />
    </Suspense>
  );
}
