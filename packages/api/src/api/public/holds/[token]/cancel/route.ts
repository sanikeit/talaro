import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SELLER_HOLD_MODULE } from "../../../../../modules/seller-hold";

export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const token = req.params.token;

  if (!token || typeof token !== "string") {
    res.status(400).json({ message: "Token is required." });
    return;
  }

  const sellerHoldService = req.scope.resolve(SELLER_HOLD_MODULE) as any;
  const holds = await sellerHoldService.listStockHolds({ token });
  const hold = holds?.[0];

  if (!hold) {
    res.status(404).json({ message: "Hold pass not found." });
    return;
  }

  if (hold.status !== "requested" && hold.status !== "confirmed") {
    res.status(400).json({
      message: `Cannot cancel hold with status '${hold.status}'.`,
    });
    return;
  }

  const reason = (req.body as any)?.reason ? String((req.body as any).reason) : "Cancelled by buyer";

  await sellerHoldService.updateStockHolds({
    id: hold.id,
    status: "cancelled",
    notes: reason,
  });

  res.json({
    success: true,
    message: "Hold cancelled successfully.",
    status: "cancelled",
  });
};
