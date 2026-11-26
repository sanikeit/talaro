import { redirect } from "next/navigation";

export default async function LegacySellerRedirect({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>;
}) {
  const { handle, locale } = await params;
  redirect(`/${locale}/s/${handle}`);
}
