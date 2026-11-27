import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError } from "@medusajs/framework/utils";
import { SELLER_HOLD_MODULE } from "../../../../../modules/seller-hold";

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
): Promise<void> => {
  const sellerId =
    (req as any).seller_context?.seller_id ||
    (req.headers["x-seller-id"] as string);

  if (!sellerId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "Seller context required."
    );
  }

  const { id } = req.params;
  const sellerHoldService = req.scope.resolve(SELLER_HOLD_MODULE) as any;
  const hold = await sellerHoldService.retrieveStockHold(id);

  if (!hold) {
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Hold not found.");
  }

  if (hold.seller_id !== sellerId) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      "You do not have permission to manage this hold."
    );
  }

  if (hold.status !== "requested") {
    res.status(400).json({
      message: `Cannot reject a hold with status '${hold.status}'.`,
    });
    return;
  }

  const reason = (req.body as any)?.reason || "Declined by seller";
  const now = new Date();

  const updated = await sellerHoldService.updateStockHolds({
    id: hold.id,
    status: "rejected",
    seller_action: "reject",
    rejection_reason: reason,
    responded_at: now,
  });

  res.json({ hold: updated });
};
