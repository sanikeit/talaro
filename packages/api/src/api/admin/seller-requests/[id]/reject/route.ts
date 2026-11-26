import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SELLER_INVITE_MODULE } from "../../../../../modules/seller-invite";

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = req.body as Record<string, any> | undefined;
  const rejectionReason = body?.rejection_reason;

  if (
    !rejectionReason ||
    typeof rejectionReason !== "string" ||
    rejectionReason.trim().length < 5
  ) {
    res.status(400).json({
      message: "rejection_reason is required (minimum 5 characters)",
    });
    return;
  }

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

  const [updated] = await sellerInviteService.updateSellerRequests([
    {
      id: requestId,
      status: "rejected",
      reviewed_by: adminUserId,
      reviewed_at: new Date(),
      rejection_reason: rejectionReason.trim(),
    },
  ]);

  res.json({ seller_request: updated });
}
