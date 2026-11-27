import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { SELLER_HOLD_MODULE } from "../../../../modules/seller-hold";

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const token = req.params.token;

  if (!token || typeof token !== "string") {
    res.status(400).json({ message: "Token is required." });
    return;
  }

  const sellerHoldService = req.scope.resolve(SELLER_HOLD_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const now = new Date();

  const holds = await sellerHoldService.listStockHolds({ token });
  const hold = holds?.[0];

  if (!hold) {
    res.status(404).json({ message: "Hold pass not found." });
    return;
  }

  // Lazy expiration check
  if (
    (hold.status === "requested" || hold.status === "confirmed") &&
    hold.expires_at &&
    new Date(hold.expires_at) < now
  ) {
    await sellerHoldService.updateStockHolds({ id: hold.id, status: "expired" });
    hold.status = "expired";
  }

  // Query offer, product, and seller details
  let offer: any = null;
  try {
    const { data: offers } = await query.graph({
      entity: "offer",
      fields: [
        "id",
        "seller.id",
        "seller.name",
        "seller.handle",
        "seller.phone",
        "seller.address.*",
        "product.title",
        "product.thumbnail",
        "product.description",
        "prices.*",
      ],
      filters: { id: hold.offer_id },
    });
    offer = offers?.[0];
  } catch (_e) {}

  const priceObj =
    offer?.prices?.find((p: any) => p.currency_code?.toLowerCase() === "inr") ||
    offer?.prices?.[0];

  res.json({
    id: hold.id,
    token: hold.token,
    status: hold.status,
    requested_at: hold.requested_at,
    responded_at: hold.responded_at,
    expires_at: hold.expires_at,
    rejection_reason: hold.rejection_reason,
    buyer_name: hold.buyer_name,
    buyer_phone: hold.buyer_phone,
    can_cancel: hold.status === "requested" || hold.status === "confirmed",
    product: {
      title: offer?.product?.title || "Item",
      thumbnail: offer?.product?.thumbnail || null,
      price: priceObj ? Math.round(priceObj.amount) : null,
      currency: "INR",
    },
    seller: {
      name: offer?.seller?.name || "Verified Local Seller",
      handle: offer?.seller?.handle || null,
      phone: offer?.seller?.phone || null,
      address_line: offer?.seller?.address?.address_1 || null,
      city: offer?.seller?.address?.city || null,
      pincode: offer?.seller?.address?.postal_code || null,
    },
  });
};
