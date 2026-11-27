import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import crypto from "crypto";
import { SELLER_HOLD_MODULE } from "../../../modules/seller-hold";

function normalizeIndianPhone(input: string): string | null {
  const cleaned = String(input).trim().replace(/[\s\-\(\)]/g, "");
  let tenDigits = "";
  if (/^\+91[0-9]{10}$/.test(cleaned)) {
    tenDigits = cleaned.slice(3);
  } else if (/^91[0-9]{10}$/.test(cleaned)) {
    tenDigits = cleaned.slice(2);
  } else if (/^0[0-9]{10}$/.test(cleaned)) {
    tenDigits = cleaned.slice(1);
  } else if (/^[0-9]{10}$/.test(cleaned)) {
    tenDigits = cleaned;
  } else {
    return null;
  }
  return `+91${tenDigits}`;
}

export const POST = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const body = req.body as Record<string, any> | undefined;
  if (!body) {
    res.status(400).json({ message: "Request body is required." });
    return;
  }

  const { offer_id, buyer_phone, buyer_name } = body;

  if (!offer_id || typeof offer_id !== "string" || !offer_id.trim()) {
    res.status(400).json({ message: "Field 'offer_id' is required." });
    return;
  }

  if (!buyer_phone || typeof buyer_phone !== "string" || !buyer_phone.trim()) {
    res.status(400).json({ message: "Field 'buyer_phone' is required." });
    return;
  }

  const normalizedPhone = normalizeIndianPhone(buyer_phone);
  if (!normalizedPhone) {
    res.status(400).json({
      message: "Invalid phone number. Must be a 10-digit Indian mobile number.",
    });
    return;
  }

  const sellerHoldService = req.scope.resolve(SELLER_HOLD_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const now = new Date();

  // 1. Check active holds count for this buyer_phone (max 2 active)
  const buyerActiveHolds = await sellerHoldService.listStockHolds({
    buyer_phone: normalizedPhone,
    status: ["requested", "confirmed"],
  });

  const validActiveHolds = (buyerActiveHolds || []).filter((h: any) => {
    if (h.expires_at && new Date(h.expires_at) < now) {
      // Lazily update expired
      sellerHoldService.updateStockHolds({ id: h.id, status: "expired" }).catch(() => {});
      return false;
    }
    return true;
  });

  if (validActiveHolds.length >= 2) {
    res.status(429).json({
      message:
        "Active hold limit reached (max 2 active holds allowed). Please visit the shop or cancel an existing hold.",
    });
    return;
  }

  // 2. Check 24-hour daily hold rate limit for this buyer_phone (max 3 holds per day)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const buyerDailyHolds = await sellerHoldService.listStockHolds({
    buyer_phone: normalizedPhone,
    requested_at: { $gte: oneDayAgo },
  });

  if ((buyerDailyHolds || []).length >= 3) {
    res.status(429).json({
      message: "Daily hold limit reached (max 3 holds per 24 hours).",
    });
    return;
  }

  // 3. Check if target offer is already held
  const existingOfferHolds = await sellerHoldService.listStockHolds({
    offer_id: String(offer_id).trim(),
    status: ["requested", "confirmed"],
  });

  const isOfferAlreadyHeld = (existingOfferHolds || []).some((h: any) => {
    if (h.expires_at && new Date(h.expires_at) < now) {
      sellerHoldService.updateStockHolds({ id: h.id, status: "expired" }).catch(() => {});
      return false;
    }
    return true;
  });

  if (isOfferAlreadyHeld) {
    res.status(409).json({
      message: "This item is currently on hold or requested by another buyer.",
    });
    return;
  }

  // 4. Fetch offer and seller details
  const { data: offers } = await query.graph({
    entity: "offer",
    fields: [
      "id",
      "seller_id",
      "seller.id",
      "seller.name",
      "seller.phone",
      "seller.handle",
      "product.title",
      "product.thumbnail",
      "prices.*",
    ],
    filters: { id: String(offer_id).trim() },
  });

  const offer = offers?.[0];
  if (!offer) {
    res.status(404).json({ message: "Offer not found." });
    return;
  }

  // 5. Generate secure tokens & 4-hour confirmation window
  const token = crypto.randomBytes(12).toString("hex");
  const seller_token = crypto.randomBytes(12).toString("hex");
  const expires_at = new Date(now.getTime() + 4 * 60 * 60 * 1000);
  const buyerDisplayName = buyer_name ? String(buyer_name).trim() : "Buyer";

  const [hold] = await sellerHoldService.createStockHolds([
    {
      offer_id: offer.id,
      seller_id: offer.seller_id,
      buyer_phone: normalizedPhone,
      buyer_name: buyerDisplayName,
      status: "requested",
      token,
      seller_token,
      requested_at: now,
      expires_at,
    },
  ]);

  // Remote links
  try {
    const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK);
    await remoteLink.create([
      {
        offer: { offer_id: offer.id },
        seller_hold: { stock_hold_id: hold.id },
      },
      {
        seller: { seller_id: offer.seller_id },
        seller_hold: { stock_hold_id: hold.id },
      },
    ]);
  } catch (_e) {
    // Links already handled or silently synced
  }

  // 6. Build WhatsApp deep-link
  const backendUrl =
    process.env.MEDUSA_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:9000";
  const storefrontUrl = process.env.STOREFRONT_URL || "http://localhost:8000";

  const priceObj =
    offer.prices?.find((p: any) => p.currency_code?.toLowerCase() === "inr") ||
    offer.prices?.[0];
  const priceFormatted = priceObj ? Math.round(priceObj.amount).toString() : "N/A";
  const sellerName = offer.seller?.name || "Shop Owner";
  const productTitle = offer.product?.title || "Product";

  const confirmUrl = `${backendUrl}/public/holds/action/${seller_token}?action=confirm`;
  const rejectUrl = `${backendUrl}/public/holds/action/${seller_token}?action=reject`;

  const messageText = `Hi ${sellerName}, I'd like to request a 24h courtesy hold on:
📦 ${productTitle}
💰 ₹${priceFormatted}
👤 Buyer: ${buyerDisplayName} (${normalizedPhone})

👉 Seller 1-Click Confirmation:
✅ Hold for 24h: ${confirmUrl}
❌ Cannot hold: ${rejectUrl}`;

  const sellerPhoneRaw = offer.seller?.phone || "919999999999";
  const sellerPhoneDigits = sellerPhoneRaw.replace(/\D/g, "");
  const whatsappUrl = `https://wa.me/${sellerPhoneDigits}?text=${encodeURIComponent(
    messageText
  )}`;

  res.status(201).json({
    id: hold.id,
    status: hold.status,
    token: hold.token,
    seller_token: hold.seller_token,
    requested_at: hold.requested_at,
    expires_at: hold.expires_at,
    whatsapp_url: whatsappUrl,
    pass_url: `${storefrontUrl}/h/${token}`,
  });
};
