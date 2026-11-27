import { Suspense } from "react";
import { Metadata } from "next";
import { HoldPassContent } from "@/components/hold/hold-pass-content";

export const metadata: Metadata = {
  title: "Courtesy Hold Pass",
  description: "View and manage your 24-hour courtesy inventory hold.",
};

async function HoldPassLoader({
  paramsPromise,
}: {
  paramsPromise: Promise<{ token: string }>;
}) {
  const { token } = await paramsPromise;
  return <HoldPassContent token={token} />;
}

export default function HoldPassPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="animate-pulse text-slate-500 font-medium">Loading hold pass...</div>
        </div>
      }
    >
      <HoldPassLoader paramsPromise={params} />
    </Suspense>
  );
}
