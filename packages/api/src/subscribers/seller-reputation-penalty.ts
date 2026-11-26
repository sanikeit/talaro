import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework";
import { SELLER_REFERRAL_MODULE } from "../modules/seller-referral";

type SellerEventData = {
  id: string;
};

/**
 * Handles seller reputation penalty when a referred seller is suspended or terminated.
 */
export async function applySellerReputationPenalty(
  container: SubscriberArgs["container"],
  sellerId: string,
  eventSource: string
) {
  const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;

  // 1. Load seller_referral for the suspended/terminated seller (seller B)
  const referrals = await sellerReferralService.listSellerReferrals({
    seller_id: sellerId,
  });
  const referralB = referrals?.[0];
  if (!referralB) {
    return;
  }

  // 2. If referred_by_seller_id is null → no-op (admin invite, no referrer to penalize)
  if (!referralB.referred_by_seller_id) {
    return;
  }

  const referrerSellerId = referralB.referred_by_seller_id;

  // 3. If referred_by_seller_id is set → load referrer's seller_referral
  const referrerReferrals = await sellerReferralService.listSellerReferrals({
    seller_id: referrerSellerId,
  });
  const referrerReferral = referrerReferrals?.[0];
  if (!referrerReferral) {
    return;
  }

  // 4. Decrement referrer.invite_quota by 1 (min 0)
  const currentQuota = Number(referrerReferral.invite_quota || 0);
  const newQuota = Math.max(0, currentQuota - 1);

  // 5. Set referrer.invite_quota_resets_at = GREATEST(now(), invite_quota_resets_at) + 90 days (freeze penalty)
  const now = new Date();
  const existingResetsAt = referrerReferral.invite_quota_resets_at
    ? new Date(referrerReferral.invite_quota_resets_at)
    : now;
  const baseDate = existingResetsAt > now ? existingResetsAt : now;
  const newResetsAt = new Date(baseDate.getTime() + 90 * 24 * 60 * 60 * 1000);

  // 6. Log the penalty reason on the referral row
  const penaltyReason = `Referred seller ${sellerId} was ${eventSource}. Quota decremented to ${newQuota}. Reset frozen until ${newResetsAt.toISOString()}.`;

  await sellerReferralService.updateSellerReferrals([
    {
      id: referrerReferral.id,
      invite_quota: newQuota,
      invite_quota_resets_at: newResetsAt,
      penalty_reason: penaltyReason,
    },
  ]);
}

export default async function sellerSuspendedSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<SellerEventData>) {
  if (!data?.id) return;
  await applySellerReputationPenalty(container, data.id, name);
}

export const config: SubscriberConfig = {
  event: ["seller.suspended", "seller.terminated"],
};
