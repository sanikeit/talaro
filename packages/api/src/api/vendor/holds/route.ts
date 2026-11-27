import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { SELLER_HOLD_MODULE } from "../../../modules/seller-hold";

export const GET = async (
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

  const sellerHoldService = req.scope.resolve(SELLER_HOLD_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const now = new Date();

  const statusFilter = typeof req.query.status === "string" ? req.query.status.trim() : undefined;

  const filters: Record<string, any> = {
    seller_id: sellerId,
  };

  if (statusFilter) {
    if (statusFilter.includes(",")) {
      filters.status = statusFilter.split(",").map((s) => s.trim());
    } else {
      filters.status = statusFilter;
    }
  }

  const holds = await sellerHoldService.listStockHolds(filters, {
    order: { created_at: "DESC" },
  });

  // Check lazy expiry on holds returned
  const formattedHolds = await Promise.all(
    (holds || []).map(async (h: any) => {
      let currentStatus = h.status;
      if (
        (currentStatus === "requested" || currentStatus === "confirmed") &&
        h.expires_at &&
        new Date(h.expires_at) < now
      ) {
        await sellerHoldService.updateStockHolds({ id: h.id, status: "expired" });
        currentStatus = "expired";
      }

      // Fetch offer title & price
      let productTitle = "Item";
      let thumbnail: string | null = null;
      let price: number | null = null;
      try {
        const { data: offers } = await query.graph({
          entity: "offer",
          fields: ["id", "product.title", "product.thumbnail", "prices.*"],
          filters: { id: h.offer_id },
        });
        const offer = offers?.[0];
        if (offer?.product?.title) productTitle = offer.product.title;
        if (offer?.product?.thumbnail) thumbnail = offer.product.thumbnail;
        const priceObj =
          offer?.prices?.find((p: any) => p.currency_code?.toLowerCase() === "inr") ||
          offer?.prices?.[0];
        if (priceObj) price = Math.round(priceObj.amount);
      } catch (_e) {}

      return {
        id: h.id,
        token: h.token,
        status: currentStatus,
        requested_at: h.requested_at,
        responded_at: h.responded_at,
        expires_at: h.expires_at,
        buyer_name: h.buyer_name,
        buyer_phone: h.buyer_phone,
        rejection_reason: h.rejection_reason,
        product: {
          title: productTitle,
          thumbnail,
          price,
          currency: "INR",
        },
      };
    })
  );

  res.json({ holds: formattedHolds });
};
