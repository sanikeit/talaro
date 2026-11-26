import { Metadata } from "next";
import { SellerDetailContent } from "@/components/sellers/seller-detail-content";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  try {
    const res = await fetch(`${apiUrl}/public/sellers/${handle}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      return {
        title: "Seller Not Found",
        description: "Seller not found or not currently active.",
      };
    }

    const data = await res.json();
    const seller = data.seller;
    const locationStr = seller.city ? ` in ${seller.city}` : "";
    const rawDesc = `${seller.name}${locationStr} — verified supplier on Talaro.${seller.description ? " " + seller.description : ""}`;

    return {
      title: seller.name || "Seller",
      description: rawDesc.slice(0, 160),
    };
  } catch {
    return {
      title: "Seller",
      description: "Verified supplier on Talaro.",
    };
  }
}

export default async function UnlocalizedSellerDetailPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  return <SellerDetailContent handle={handle} backHref="/sellers" />;
}