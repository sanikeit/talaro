import { Metadata } from "next";
import { SellersPageContent } from "@/components/sellers/sellers-page-content";

export const metadata: Metadata = {
  title: "Verified hardware suppliers near you | Talaro",
  description: "Every seller is verified. Contact directly on WhatsApp.",
};

export default function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; pincode?: string }>;
}) {
  return <SellersPageContent searchParams={searchParams} />;
}
