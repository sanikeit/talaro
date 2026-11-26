import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SELLER_INVITE_MODULE } from "../../../../../modules/seller-invite";
import { approveSellerRequestWorkflow } from "../../../../../workflows/seller-request/approve-seller-request";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const sellerInviteService = req.scope.resolve(SELLER_INVITE_MODULE) as any;
  const requestId = req.params.id;

  const request = await sellerInviteService.retrieveSellerRequest(requestId).catch(() => null);
  if (!request) {
    res.status(404).json({ message: "Seller request not found" });
    return;
  }

  if (request.status !== "pending") {
    res.status(409).json({ message: `Request is already ${request.status}` });
    return;
  }

  const adminUserId =
    (req as any).auth_context?.actor_id ||
    (req as any).user?.id ||
    "admin";

  const { result } = await approveSellerRequestWorkflow(req.scope).run({
    input: {
      sellerRequestId: requestId,
      adminUserId,
    },
  });

  res.json({
    seller_request: result.seller_request,
    invite: {
      id: result.invite.id,
      code: result.invite.code,
      expires_at: result.invite.expires_at,
      max_uses: result.invite.max_uses,
    },
  });
}
