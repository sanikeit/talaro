import { Metadata } from "next";
import { SellerDetailContent } from "@/components/sellers/seller-detail-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  try {
    const res = await fetch(`${apiUrl}/public/sellers/${handle}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return {
        title: "Seller Not Found | Talaro",
        description: "Seller not found or not currently active.",
      };
    }

    const data = await res.json();
    const seller = data.seller;
    const locationStr = seller.city ? ` in ${seller.city}` : "";

    return {
      title: `${seller.name} | Talaro`,
      description: `${seller.name}${locationStr} — verified supplier on Talaro.`,
    };
  } catch {
    return {
      title: "Seller | Talaro",
      description: "Verified supplier on Talaro.",
    };
  }
}

export default async function LocalizedSellerDetailPage({
  params,
}: {
  params: Promise<{ handle: string; locale: string }>;
}) {
  const { handle, locale } = await params;
  return <SellerDetailContent handle={handle} backHref={`/${locale}/sellers`} />;
}
