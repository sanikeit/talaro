import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
  transform,
} from "@medusajs/framework/workflows-sdk";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import {
  createSellerAccountWorkflow,
  approveSellerWorkflow,
} from "@mercurjs/core/workflows";
import { MercurModules } from "@mercurjs/types";
import { SELLER_INVITE_MODULE } from "../../modules/seller-invite";
import { SELLER_REFERRAL_MODULE } from "../../modules/seller-referral";
import { handleSellerCreated } from "../hooks/seller-created";

export type CreateSellerWithInviteInput = {
  invite_id: string;
  seller_request_id?: string;
  auth_identity_id?: string;
  member_id?: string;
  seller: any;
  member_email?: string;
  first_name?: string;
  last_name?: string;
  address?: Record<string, any>;
  professional_details?: Record<string, any>;
  payment_details?: Record<string, any>;
  additional_data?: Record<string, any>;
  region_ids?: string[];
};

// In-memory mutex per invite_id to serialize concurrent requests for the same invite
const inviteMutexes = new Map<string, Promise<void>>();
const inviteReleasers = new Map<string, () => void>();

export function releaseInviteLock(inviteId: string) {
  const releaser = inviteReleasers.get(inviteId);
  inviteReleasers.delete(inviteId);
  inviteMutexes.delete(inviteId);
  if (releaser) {
    releaser();
  }
}

export async function acquireInviteLock(inviteId: string): Promise<void> {
  while (inviteMutexes.has(inviteId)) {
    try {
      await Promise.race([
        inviteMutexes.get(inviteId),
        new Promise((resolve) => setTimeout(resolve, 15000)),
      ]);
    } catch (_e) {}
  }

  let releaseLock: () => void = () => {};
  const lockPromise = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  inviteMutexes.set(inviteId, lockPromise);
  inviteReleasers.set(inviteId, releaseLock);
}

export const lockAndValidateInviteStep = createStep(
  "lock-and-validate-invite-step",
  async (input: { inviteId: string }, { container }) => {
    const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as any;

    // Acquire lock to serialize concurrent attempts on the same invite
    await acquireInviteLock(input.inviteId);

    try {
      // Execute SELECT FOR UPDATE on seller_invite
      const { rows } = await pg.raw(
        `SELECT * FROM seller_invite WHERE id = ? AND deleted_at IS NULL FOR UPDATE`,
        [input.inviteId]
      );

      const invite = rows?.[0];
      if (!invite) {
        throw new MedusaError(MedusaError.Types.FORBIDDEN, "Invalid invite code.");
      }

      if (Number(invite.use_count) >= Number(invite.max_uses)) {
        throw new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invite code has reached its maximum uses."
        );
      }

      const now = new Date();
      if (new Date(invite.expires_at) <= now) {
        throw new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invite code has expired."
        );
      }

      if (invite.status !== "active") {
        throw new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invite code is no longer active."
        );
      }

      return new StepResponse({ invite }, { inviteId: input.inviteId });
    } catch (err) {
      releaseInviteLock(input.inviteId);
      throw err;
    }
  },
  async (compensationData) => {
    if (compensationData?.inviteId) {
      releaseInviteLock(compensationData.inviteId);
    }
  }
);

export const consumeInviteStep = createStep(
  "consume-invite-step",
  async (
    input: { inviteId: string; sellerId: string },
    { container }
  ) => {
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;

    const invite = await sellerInviteService.retrieveSellerInvite(input.inviteId);
    if (!invite) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Invite not found");
    }

    const previousSnapshot = {
      use_count: invite.use_count,
      used_at: invite.used_at,
      status: invite.status,
      used_by_seller_id: invite.used_by_seller_id,
    };

    const newUseCount = Number(invite.use_count) + 1;
    const now = new Date();
    const newStatus = newUseCount >= Number(invite.max_uses) ? "expired" : invite.status;

    const [updatedInvite] = await sellerInviteService.updateSellerInvites([
      {
        id: invite.id,
        use_count: newUseCount,
        used_at: now,
        used_by_seller_id: input.sellerId,
        status: newStatus,
      },
    ]);

    return new StepResponse(
      { invite: updatedInvite },
      {
        inviteId: invite.id,
        previousSnapshot,
      }
    );
  },
  async (compensationData, { container }) => {
    if (!compensationData) return;
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;

    await sellerInviteService.updateSellerInvites([
      {
        id: compensationData.inviteId,
        use_count: compensationData.previousSnapshot.use_count,
        used_at: compensationData.previousSnapshot.used_at,
        status: compensationData.previousSnapshot.status,
        used_by_seller_id: compensationData.previousSnapshot.used_by_seller_id,
      },
    ]);
  }
);

export const recordReferralStep = createStep(
  "record-referral-step",
  async (
    input: {
      sellerId: string;
      inviteId: string;
      referredBySellerId?: string | null;
    },
    { container }
  ) => {
    const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    const resetsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const [referral] = await sellerReferralService.createSellerReferrals([
      {
        seller_id: input.sellerId,
        referred_by_seller_id: input.referredBySellerId || null,
        invite_id: input.inviteId,
        verification_tier: "INCOMPLETE",
        invite_quota: 0,
        invite_quota_resets_at: resetsAt,
      },
    ]);

    try {
      await remoteLink.create([
        {
          [MercurModules.SELLER]: { seller_id: input.sellerId },
          [SELLER_REFERRAL_MODULE]: { seller_referral_id: referral.id },
        },
      ]);
    } catch (err) {
      await sellerReferralService.deleteSellerReferrals([referral.id]);
      throw err;
    }

    // Ensure seller has default shipping profile + INR region (idempotent guard checks link)
    await handleSellerCreated(container, { id: input.sellerId });

    return new StepResponse(referral, {
      referralId: referral.id,
      sellerId: input.sellerId,
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

export async function ensureSellerAddressFromRequest(
  container: any,
  sellerId: string,
  requestId: string
): Promise<{ addressId?: string; created: boolean }> {
  const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;
  const sellerService = container.resolve(MercurModules.SELLER) as any;

  let sellerRequest: any = null;
  try {
    sellerRequest = await sellerInviteService.retrieveSellerRequest(requestId);
  } catch (_e) {
    console.warn(`[ensureSellerAddressFromRequest] Request ${requestId} not found.`);
    return { created: false };
  }

  if (!sellerRequest) {
    return { created: false };
  }

  const existingAddresses = await sellerService.listSellerAddresses({
    seller_id: sellerId,
  });

  if (existingAddresses && existingAddresses.length > 0) {
    const existing = existingAddresses[0];
    if (!existing.city || !existing.postal_code) {
      await sellerService.updateSellerAddresses([
        {
          id: existing.id,
          city: existing.city || sellerRequest.city,
          postal_code: existing.postal_code || sellerRequest.pincode,
          phone: existing.phone || sellerRequest.phone,
          address_1: existing.address_1 || sellerRequest.business_name,
        },
      ]);
    }
    return { addressId: existing.id, created: false };
  }

  const [created] = await sellerService.createSellerAddresses([
    {
      seller_id: sellerId,
      city: sellerRequest.city,
      postal_code: sellerRequest.pincode,
      address_1: sellerRequest.business_name || null,
      phone: sellerRequest.phone || null,
      company: sellerRequest.business_name || null,
      first_name: sellerRequest.contact_name || null,
    },
  ]);

  return { addressId: created.id, created: true };
}

type PopulateAddressStepInput = {
  sellerId: string;
  inviteId: string;
  sellerRequestId?: string | null;
};

type PopulateAddressStepOutput = {
  populated: boolean;
  addressId?: string;
  reason?: string;
};

type PopulateAddressCompensation = {
  addressId?: string;
};

export const populateAddressStep = createStep(
  "populate-address-step",
  async (
    input: PopulateAddressStepInput,
    { container }
  ): Promise<StepResponse<PopulateAddressStepOutput, PopulateAddressCompensation>> => {
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;
    let requestId = input.sellerRequestId;

    if (!requestId) {
      try {
        const invite = await sellerInviteService.retrieveSellerInvite(input.inviteId);
        requestId = invite?.request_id || null;
      } catch (_e) {}
    }

    if (!requestId) {
      console.warn(
        `[populateAddressStep] Invite ${input.inviteId} has no request_id. Skipping address population.`
      );
      return new StepResponse(
        { populated: false, reason: "no_request_id" },
        {}
      );
    }

    const { addressId, created } = await ensureSellerAddressFromRequest(
      container,
      input.sellerId,
      requestId
    );

    return new StepResponse(
      { populated: true, addressId },
      { addressId: created ? addressId : undefined }
    );
  },
  async (compensationData: PopulateAddressCompensation | undefined, { container }) => {
    if (compensationData?.addressId) {
      const sellerService = container.resolve(MercurModules.SELLER) as any;
      try {
        await sellerService.deleteSellerAddresses([compensationData.addressId]);
      } catch (_err) {}
    }
  }
);

export const optionalApproveStep = createStep(
  "optional-approve-step",
  async (
    input: {
      sellerId: string;
      inviteId: string;
    },
    { container }
  ) => {
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;
    const sellerReferralService = container.resolve(SELLER_REFERRAL_MODULE) as any;

    const invite = await sellerInviteService.retrieveSellerInvite(input.inviteId);
    if (!invite) {
      return new StepResponse({ approved: false, tier: "LISTED" });
    }

    // Condition 1: Admin invite (referred_by_seller_id IS NULL)
    // Seller-referral invites always require manual admin review.
    const isAdminInvite = !invite.referred_by_seller_id;

    let sellerRequest: any = null;
    if (isAdminInvite) {
      if (invite.request_id) {
        try {
          sellerRequest = await sellerInviteService.retrieveSellerRequest(invite.request_id);
        } catch (_e) {}
      } else {
        // Fallback: search approved seller requests reviewed by invite creator
        console.warn(
          `[optionalApproveStep] Legacy invite without request_id: ${invite.id}. Falling back to reviewed_by heuristic.`
        );
        try {
          const requests = await sellerInviteService.listSellerRequests({
            status: "approved",
          });
          if (requests && requests.length > 0) {
            sellerRequest =
              requests.find((r: any) => r.reviewed_by === invite.created_by) ||
              requests[0];
          }
        } catch (_e) {}
      }
    }

    const hasShopFront = Boolean(
      sellerRequest?.shop_front_photo_url && sellerRequest.shop_front_photo_url.trim()
    );
    const hasBillBook = Boolean(
      sellerRequest?.bill_book_photo_url && sellerRequest.bill_book_photo_url.trim()
    );
    const isApprovedWithProofs =
      sellerRequest &&
      sellerRequest.status === "approved" &&
      hasShopFront &&
      hasBillBook;

    const referrals = await sellerReferralService.listSellerReferrals({
      seller_id: input.sellerId,
    });
    const referral = referrals?.[0];

    if (isAdminInvite && isApprovedWithProofs) {
      // Auto-approve seller
      await approveSellerWorkflow(container).run({
        input: { seller_id: input.sellerId },
      });

      if (referral) {
        await sellerReferralService.updateSellerReferrals([
          {
            id: referral.id,
            verification_tier: "VERIFIED",
          },
        ]);
      }

      // Ensure seller_address exists with city/pincode after approval
      if (invite.request_id) {
        await ensureSellerAddressFromRequest(container, input.sellerId, invite.request_id);
      } else {
        console.warn(
          `[optionalApproveStep] Legacy invite without request_id: ${invite.id}. Skipping address check.`
        );
      }

      return new StepResponse({ approved: true, tier: "VERIFIED" });
    } else {
      // Leave in pending_approval, set verification_tier = 'LISTED'
      if (referral) {
        await sellerReferralService.updateSellerReferrals([
          {
            id: referral.id,
            verification_tier: "LISTED",
          },
        ]);
      }

      // Ensure seller_address exists even when not auto-approved
      if (invite.request_id) {
        await ensureSellerAddressFromRequest(container, input.sellerId, invite.request_id);
      } else {
        console.warn(
          `[optionalApproveStep] Legacy invite without request_id: ${invite.id}. Skipping address check.`
        );
      }

      return new StepResponse({ approved: false, tier: "LISTED" });
    }
  }
);

export const releaseInviteLockStep = createStep(
  "release-invite-lock-step",
  async (input: { inviteId: string }) => {
    releaseInviteLock(input.inviteId);
    return new StepResponse({ ok: true });
  }
);

export const createSellerWithInviteWorkflowId = "create-seller-with-invite";

export const createSellerWithInviteWorkflow = createWorkflow(
  createSellerWithInviteWorkflowId,
  (input: CreateSellerWithInviteInput) => {
    // Step 1: Lock and re-validate invite
    const { invite } = lockAndValidateInviteStep({ inviteId: input.invite_id });

    // Step 2: Nested createSellerAccountWorkflow
    const seller = createSellerAccountWorkflow.runAsStep({
      input: {
        auth_identity_id: input.auth_identity_id as string,
        member_id: input.member_id,
        seller: input.seller,
        member_email: input.member_email,
        first_name: input.first_name,
        last_name: input.last_name,
        address: input.address,
        professional_details: input.professional_details,
        payment_details: input.payment_details,
        additional_data: input.additional_data,
        region_ids: input.region_ids,
      } as any,
    });

    // Step 3: Consume invite
    const step3Input = transform({ input, seller }, ({ input, seller }) => ({
      inviteId: input.invite_id,
      sellerId: seller.id,
    }));
    consumeInviteStep(step3Input);

    // Step 4: Record referral & remote link
    const step4Input = transform({ input, seller, invite }, ({ input, seller, invite }) => ({
      sellerId: seller.id,
      inviteId: input.invite_id,
      referredBySellerId: invite.referred_by_seller_id,
    }));
    recordReferralStep(step4Input);

    // Step 5: Populate seller address from linked seller request
    const step5AddressInput = transform({ input, seller, invite }, ({ input, seller, invite }) => ({
      sellerId: seller.id,
      inviteId: input.invite_id,
      sellerRequestId: input.seller_request_id || invite.request_id || null,
    }));
    populateAddressStep(step5AddressInput);

    // Step 6: Optional auto-approve based on proof & invite type
    const step6Input = transform({ input, seller }, ({ input, seller }) => ({
      sellerId: seller.id,
      inviteId: input.invite_id,
    }));
    optionalApproveStep(step6Input);

    // Release lock
    releaseInviteLockStep({ inviteId: input.invite_id });

    return new WorkflowResponse(seller);
  }
);
