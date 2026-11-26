import { MedusaContainer } from "@medusajs/framework/types";
import { SELLER_REFERRAL_MODULE } from "../modules/seller-referral";
import { isSellerQualifiedForQuota } from "../utils/quota-qualification";

/**
 * Checks seller eligibility for invite quota (quota=3) based on 3 criteria:
 * a. seller.created_at <= now() - 30 days
 * b. verification_tier = 'VERIFIED'
 * c. At least 3 active offers (deleted_at IS NULL, status='active')
 */
export async function qualifySellersForQuota(
  container: MedusaContainer
): Promise<string[]> {
  const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;

  // Query all referrals with verification_tier = 'VERIFIED'
  const referrals = await sellerReferralService.listSellerReferrals({
    verification_tier: "VERIFIED",
  });

  const now = new Date();
  const qualifiedSellerIds: string[] = [];

  for (const referral of referrals) {
    // Only upgrade if current quota is less than 3
    if (Number(referral.invite_quota) >= 3) {
      continue;
    }

    const qualified = await isSellerQualifiedForQuota(container, referral.seller_id);
    if (!qualified) {
      continue;
    }

    // Seller satisfies all 3 criteria -> set invite_quota = 3, resets_at = now() + 30 days
    const resetsAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await sellerReferralService.updateSellerReferrals([
      {
        id: referral.id,
        invite_quota: 3,
        invite_quota_resets_at: resetsAt,
      },
    ]);

    qualifiedSellerIds.push(referral.seller_id);
  }

  return qualifiedSellerIds;
}

export default async function sellerQuotaQualificationJob(
  container: MedusaContainer
) {
  try {
    const qualified = await qualifySellersForQuota(container);
    if (qualified.length > 0) {
      console.log(
        `[sellerQuotaQualificationJob] Qualified ${qualified.length} sellers for invite quota:`,
        qualified
      );
    }
  } catch (error) {
    console.error(
      "[sellerQuotaQualificationJob] Failed to evaluate seller quota qualification:",
      error
    );
  }
}

export const config = {
  name: "seller-quota-qualification",
  schedule: "0 0 * * *", // Runs daily at midnight
};
