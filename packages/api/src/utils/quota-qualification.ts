import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { SELLER_REFERRAL_MODULE } from "../modules/seller-referral";

/**
 * Checks whether a seller is qualified for the 3-invite quota allocation.
 *
 * Qualification Criteria:
 * 1. Verification: seller_referral.verification_tier === 'VERIFIED'
 * 2. Age: seller.created_at <= now() - 30 days
 * 3. Activity: At least 3 active offers (deleted_at IS NULL, status='active' if present)
 */
export async function isSellerQualifiedForQuota(
  container: MedusaContainer,
  sellerId: string
): Promise<boolean> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;

  // 1. Load seller_referral for sellerId
  const referrals = await sellerReferralService.listSellerReferrals({
    seller_id: sellerId,
  });
  const referral = referrals?.[0];
  if (!referral) {
    return false;
  }

  // Check verification_tier === 'VERIFIED'
  if (referral.verification_tier !== "VERIFIED") {
    return false;
  }

  // 2. Check seller.created_at <= now() - 30 days
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "created_at", "status"],
    filters: { id: sellerId },
  });
  const seller = sellers?.[0];
  if (!seller || !seller.created_at) {
    return false;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sellerCreatedAt = new Date(seller.created_at);
  if (sellerCreatedAt > thirtyDaysAgo) {
    return false;
  }

  // 3. Check at least 3 active offers (deleted_at IS NULL, status='active' if present)
  const { data: offers } = await query.graph({
    entity: "offer",
    fields: ["id", "deleted_at", "status"],
    filters: {
      seller_id: sellerId,
      deleted_at: null,
    },
  });

  const activeOffers = (offers || []).filter(
    (o: any) => !o.deleted_at && (o.status === undefined || o.status === "active")
  );

  return activeOffers.length >= 3;
}
