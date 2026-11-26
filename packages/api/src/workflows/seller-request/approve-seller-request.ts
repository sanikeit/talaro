import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MedusaError } from "@medusajs/framework/utils";
import { SELLER_INVITE_MODULE } from "../../modules/seller-invite";
import { generate12CharCode } from "../../utils/code-generator";

export const approveSellerRequestStep = createStep(
  "approve-seller-request-step",
  async (
    input: {
      sellerRequestId: string;
      adminUserId: string;
    },
    { container }
  ) => {
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;

    const request = await sellerInviteService.retrieveSellerRequest(input.sellerRequestId);
    if (!request) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "Seller request not found");
    }
    if (request.status !== "pending") {
      throw new MedusaError(
        MedusaError.Types.CONFLICT,
        `Request is already ${request.status}`
      );
    }

    // 1. Generate unique 12-char uppercase code with up to 5 collision retries
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
        "Failed to generate unique invite code after 5 attempts"
      );
    }

    // 2. Create seller invite record (expires in 14 days, max_uses = 1)
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const [invite] = await sellerInviteService.createSellerInvites([
      {
        code,
        created_by: input.adminUserId,
        // role: who can create with this code.
        //   'admin' — only admins can create (used for direct admin invites)
        //   'seller' — admins OR eligible sellers can create (used for approved requests + seller referrals)
        role: "seller",
        max_uses: 1,
        use_count: 0,
        status: "active",
        expires_at: expiresAt,
        request_id: input.sellerRequestId,
      },
    ]);

    // 3. Update seller request to approved
    try {
      const [updatedRequest] = await sellerInviteService.updateSellerRequests([
        {
          id: input.sellerRequestId,
          status: "approved",
          reviewed_by: input.adminUserId,
          reviewed_at: new Date(),
        },
      ]);

      return new StepResponse(
        { seller_request: updatedRequest, invite },
        {
          inviteId: invite.id,
          sellerRequestId: input.sellerRequestId,
          previousStatus: request.status,
          previousReviewedBy: request.reviewed_by,
          previousReviewedAt: request.reviewed_at,
        }
      );
    } catch (err) {
      // Clean up invite if update fails
      await sellerInviteService.deleteSellerInvites([invite.id]);
      throw err;
    }
  },
  async (compensationData, { container }) => {
    if (!compensationData) return;
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;

    try {
      await sellerInviteService.deleteSellerInvites([compensationData.inviteId]);
    } catch (_err) {}

    try {
      await sellerInviteService.updateSellerRequests([
        {
          id: compensationData.sellerRequestId,
          status: compensationData.previousStatus,
          reviewed_by: compensationData.previousReviewedBy,
          reviewed_at: compensationData.previousReviewedAt,
        },
      ]);
    } catch (_err) {}
  }
);

export const approveSellerRequestWorkflow = createWorkflow(
  "approve-seller-request-workflow",
  (input: {
    sellerRequestId: string;
    adminUserId: string;
  }) => {
    const result = approveSellerRequestStep(input);
    return new WorkflowResponse(result);
  }
);
