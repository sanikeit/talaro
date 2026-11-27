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
      message: `Cannot confirm a hold with status '${hold.status}'.`,
    });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours confirmation

  const updated = await sellerHoldService.updateStockHolds({
    id: hold.id,
    status: "confirmed",
    seller_action: "confirm",
    responded_at: now,
    expires_at: expiresAt,
  });

  res.json({ hold: updated });
};
