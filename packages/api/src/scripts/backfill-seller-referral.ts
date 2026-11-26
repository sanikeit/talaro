import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MercurModules } from "@mercurjs/types";
import { SELLER_REFERRAL_MODULE } from "../modules/seller-referral";

export const createSellerReferralWithLinkStep = createStep(
  "create-seller-referral-with-link-step",
  async (
    input: {
      seller_id: string;
      referred_by_seller_id?: string | null;
      invite_id?: string | null;
      verification_tier?: string;
      invite_quota?: number;
      invite_quota_resets_at?: Date | null;
    },
    { container }
  ) => {
    const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    // 1. Create seller referral record
    const [referral] = await sellerReferralService.createSellerReferrals([input]);

    // 2. Set remote link atomically in the same transactional step
    try {
      await remoteLink.create([
        {
          [MercurModules.SELLER]: { seller_id: input.seller_id },
          [SELLER_REFERRAL_MODULE]: { seller_referral_id: referral.id },
        },
      ]);
    } catch (err) {
      await sellerReferralService.deleteSellerReferrals([referral.id]);
      throw err;
    }

    return new StepResponse(referral, {
      referralId: referral.id,
      sellerId: input.seller_id,
    });
  },
  async (compensationData, { container }) => {
    if (!compensationData) return;
    const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    try {
      await remoteLink.dismiss([
        {
          [MercurModules.SELLER]: { seller_id: compensationData.sellerId },
          [SELLER_REFERRAL_MODULE]: { seller_referral_id: compensationData.referralId },
        },
      ]);
    } catch (_err) {}
    await sellerReferralService.deleteSellerReferrals([compensationData.referralId]);
  }
);

export const createSellerReferralWorkflow = createWorkflow(
  "create-seller-referral-workflow",
  (input: {
    seller_id: string;
    referred_by_seller_id?: string | null;
    invite_id?: string | null;
    verification_tier?: string;
    invite_quota?: number;
    invite_quota_resets_at?: Date | null;
  }) => {
    const referral = createSellerReferralWithLinkStep(input);
    return new WorkflowResponse(referral);
  }
);

export default async function backfillSellerReferrals({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;

  console.log("=== Backfilling Seller Referral Records ===");

  // 1. Fetch all existing sellers
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name"],
  });

  console.log(`Found ${sellers.length} sellers to inspect.`);

  let createdCount = 0;
  let skippedCount = 0;

  const resetsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // now + 30 days

  for (const seller of sellers) {
    // Check if seller_referral already exists for this seller
    const existing = await sellerReferralService.listSellerReferrals({
      seller_id: seller.id,
    });

    if (existing && existing.length > 0) {
      skippedCount++;
      continue;
    }

    // Atomically create seller_referral and remote link in same workflow transaction
    await createSellerReferralWorkflow(container).run({
      input: {
        seller_id: seller.id,
        referred_by_seller_id: null,
        invite_id: null,
        verification_tier: "VERIFIED",
        invite_quota: 3,
        invite_quota_resets_at: resetsAt,
      },
    });

    createdCount++;
  }

  console.log(`Backfill completed: ${createdCount} rows created, ${skippedCount} skipped.`);
}
