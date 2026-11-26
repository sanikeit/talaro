import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { MercurModules } from "@mercurjs/types";
import { SELLER_INVITE_MODULE } from "../../../modules/seller-invite";
import { SELLER_REFERRAL_MODULE } from "../../../modules/seller-referral";
import { generate12CharCode } from "../../../utils/code-generator";
import { isSellerQualifiedForQuota } from "../../../utils/quota-qualification";

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const sellerId =
    (req as any).seller_context?.seller_id ||
    (req.headers["x-seller-id"] as string);

  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Seller context required."
    );
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const sellerReferralService = req.scope.resolve(SELLER_REFERRAL_MODULE) as any;
  const sellerInviteService = req.scope.resolve(SELLER_INVITE_MODULE) as any;
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  // 1. Load seller_referral for the calling seller via query.graph on seller → referral
  let referral: any = null;
  try {
    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: ["id", "seller_referral.*"],
      filters: { id: sellerId },
    });
    const graphReferral = sellers?.[0]?.seller_referral;
    referral = Array.isArray(graphReferral) ? graphReferral[0] : graphReferral;
  } catch (_e) {}

  if (!referral) {
    const referrals = await sellerReferralService.listSellerReferrals({
      seller_id: sellerId,
    });
    referral = referrals?.[0];
  }

  if (!referral) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      "Seller referral record not found."
    );
  }

  let currentQuota = Number(referral.invite_quota || 0);
  let currentResetsAt = referral.invite_quota_resets_at
    ? new Date(referral.invite_quota_resets_at)
    : new Date();

  // 2. Lazy quota reset: if invite_quota_resets_at <= now(), check qualification and advance timer
  const now = new Date();
  if (currentResetsAt <= now) {
    const qualified = await isSellerQualifiedForQuota(req.scope, sellerId);
    currentQuota = qualified ? 3 : 0;
    currentResetsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [updatedReferral] = await sellerReferralService.updateSellerReferrals([
      {
        id: referral.id,
        invite_quota: currentQuota,
        invite_quota_resets_at: currentResetsAt,
      },
    ]);
    referral = updatedReferral;
  }

  // 3. If invite_quota <= 0 → 403 "You have no invite quota remaining. Quota resets on <date>."
  if (currentQuota <= 0) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      `You have no invite quota remaining. Quota resets on ${currentResetsAt.toISOString()}.`
    );
  }

  // 4. Generate a unique 12-char invite code
  let code = "";
  let codeFound = false;
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = generate12CharCode();
    const existing = await sellerInviteService.listSellerInvites({ code: candidate });
    if (!existing || existing.length === 0) {
      code = candidate;
      codeFound = true;
      break;
    }
  }

  if (!codeFound) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Failed to generate unique invite code after 5 attempts."
    );
  }

  // 5. Create seller_invite: code, created_by = seller_id, referred_by_seller_id = seller_id,
  //    role='seller', max_uses=1, status='active', expires_at = now() + 14 days
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const [invite] = await sellerInviteService.createSellerInvites([
    {
      code,
      created_by: sellerId,
      referred_by_seller_id: sellerId,
      role: "seller",
      max_uses: 1,
      use_count: 0,
      status: "active",
      expires_at: expiresAt,
    },
  ]);

  // 6. In the SAME transaction/flow: decrement invite_quota -= 1
  const newQuota = currentQuota - 1;
  await sellerReferralService.updateSellerReferrals([
    {
      id: referral.id,
      invite_quota: newQuota,
    },
  ]);

  // 7. Create remote link: seller_invite ↔ seller (referred_by)
  try {
    await remoteLink.create([
      {
        [MercurModules.SELLER]: { seller_id: sellerId },
        [SELLER_INVITE_MODULE]: { seller_invite_id: invite.id },
      },
    ]);
  } catch (linkError) {
    // Compensation: delete invite + restore quota
    try {
      await sellerInviteService.deleteSellerInvites([invite.id]);
    } catch (_e) {}
    try {
      await sellerReferralService.updateSellerReferrals([
        {
          id: referral.id,
          invite_quota: currentQuota,
        },
      ]);
    } catch (_e) {}
    throw linkError;
  }

  // 8. Return { invite: { id, code, expires_at } }
  res.status(201).json({
    invite: {
      id: invite.id,
      code: invite.code,
      expires_at: invite.expires_at,
    },
  });
};
