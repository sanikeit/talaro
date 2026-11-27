import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { SELLER_HOLD_MODULE } from "../../../../../modules/seller-hold";

function renderCardHtml(params: {
  title: string;
  badge: { text: string; bg: string; color: string };
  heading: string;
  message: string;
  details?: { label: string; value: string }[];
  accentColor: string;
}): string {
  const detailsHtml = (params.details || [])
    .map(
      (d) =>
        `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:14px;"><span style="color:#6b7280;">${d.label}</span><strong style="color:#111827;text-align:right;">${d.value}</strong></div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${params.title} - Talaro</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f9fafb;
      color: #111827;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .card {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 28px 24px;
      width: 100%;
      max-width: 440px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -2px rgba(0,0,0,0.05);
      text-align: center;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 9999px;
      font-size: 13px;
      font-weight: 600;
      background: ${params.badge.bg};
      color: ${params.badge.color};
      margin-bottom: 16px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 12px;
      color: #111827;
    }
    p.desc {
      font-size: 15px;
      line-height: 1.5;
      color: #4b5563;
      margin-bottom: 24px;
    }
    .details-box {
      background: #fdfdfd;
      border: 1px solid #f3f4f6;
      border-radius: 12px;
      padding: 12px 16px;
      margin-bottom: 24px;
      text-align: left;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 12px;
      background: ${params.accentColor};
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      text-align: center;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.9; }
    .footer {
      margin-top: 20px;
      font-size: 12px;
      color: #9ca3af;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">${params.badge.text}</div>
    <h1>${params.heading}</h1>
    <p class="desc">${params.message}</p>
    ${params.details && params.details.length ? `<div class="details-box">${detailsHtml}</div>` : ""}
    <a href="/seller" class="btn">Go to Seller Dashboard</a>
    <div class="footer">Talaro Verified Local Marketplace</div>
  </div>
</body>
</html>`;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const sellerToken = req.params.seller_token;
  const action = (req.query.action as string)?.toLowerCase();
  const reason = (req.query.reason as string) || "Item unavailable";

  if (!sellerToken) {
    res.status(400).type("html").send(
      renderCardHtml({
        title: "Invalid Request",
        badge: { text: "Error", bg: "#fee2e2", color: "#991b1b" },
        heading: "Invalid Link",
        message: "No action token was provided.",
        accentColor: "#2563eb",
      })
    );
    return;
  }

  const sellerHoldService = req.scope.resolve(SELLER_HOLD_MODULE) as any;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const now = new Date();

  const holds = await sellerHoldService.listStockHolds({ seller_token: sellerToken });
  const hold = holds?.[0];

  if (!hold) {
    res.status(404).type("html").send(
      renderCardHtml({
        title: "Hold Not Found",
        badge: { text: "Not Found", bg: "#fee2e2", color: "#991b1b" },
        heading: "Request Not Found",
        message: "This hold request does not exist or may have expired.",
        accentColor: "#2563eb",
      })
    );
    return;
  }

  // Fetch offer & product
  let productTitle = "Item";
  let priceStr = "N/A";
  try {
    const { data: offers } = await query.graph({
      entity: "offer",
      fields: ["id", "product.title", "prices.*"],
      filters: { id: hold.offer_id },
    });
    const offer = offers?.[0];
    if (offer?.product?.title) productTitle = offer.product.title;
    const priceObj =
      offer?.prices?.find((p: any) => p.currency_code?.toLowerCase() === "inr") ||
      offer?.prices?.[0];
    if (priceObj) priceStr = `₹${Math.round(priceObj.amount)}`;
  } catch (_e) {}

  // Check if already processed
  if (hold.status !== "requested") {
    res.status(200).type("html").send(
      renderCardHtml({
        title: "Already Processed",
        badge: { text: hold.status.toUpperCase(), bg: "#e0f2fe", color: "#0369a1" },
        heading: "Already Processed",
        message: `This hold request was previously marked as <strong>${hold.status}</strong>.`,
        details: [
          { label: "Product", value: productTitle },
          { label: "Price", value: priceStr },
          { label: "Buyer", value: `${hold.buyer_name || "Buyer"} (${hold.buyer_phone})` },
          { label: "Status", value: hold.status.toUpperCase() },
        ],
        accentColor: "#2563eb",
      })
    );
    return;
  }

  // Check if expired
  if (hold.expires_at && new Date(hold.expires_at) < now) {
    await sellerHoldService.updateStockHolds({ id: hold.id, status: "expired" });
    res.status(200).type("html").send(
      renderCardHtml({
        title: "Request Expired",
        badge: { text: "Expired", bg: "#f3f4f6", color: "#6b7280" },
        heading: "Request Window Expired",
        message: "The 4-hour window for confirming this hold has passed.",
        accentColor: "#4b5563",
      })
    );
    return;
  }

  if (action === "confirm") {
    // 24 hours confirmation from now
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    await sellerHoldService.updateStockHolds({
      id: hold.id,
      status: "confirmed",
      seller_action: "confirm",
      responded_at: now,
      expires_at: expiresAt,
    });

    const expTimeFormatted = expiresAt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
    const expDateFormatted = expiresAt.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: "Asia/Kolkata",
    });

    res.status(200).type("html").send(
      renderCardHtml({
        title: "Hold Confirmed",
        badge: { text: "ACTIVE HOLD", bg: "#dcfce7", color: "#15803d" },
        heading: "✅ 24-Hour Hold Confirmed!",
        message: `You've reserved this item for <strong>${hold.buyer_name || "the buyer"}</strong>. They have been instructed to visit your shop within 24 hours.`,
        details: [
          { label: "Product", value: productTitle },
          { label: "Price", value: priceStr },
          { label: "Buyer", value: `${hold.buyer_name || "Buyer"} (${hold.buyer_phone})` },
          { label: "Reserved Until", value: `${expDateFormatted}, ${expTimeFormatted}` },
        ],
        accentColor: "#16a34a",
      })
    );
    return;
  }

  if (action === "reject") {
    await sellerHoldService.updateStockHolds({
      id: hold.id,
      status: "rejected",
      seller_action: "reject",
      rejection_reason: reason,
      responded_at: now,
    });

    res.status(200).type("html").send(
      renderCardHtml({
        title: "Hold Declined",
        badge: { text: "DECLINED", bg: "#fee2e2", color: "#991b1b" },
        heading: "❌ Hold Request Declined",
        message: "You declined this courtesy hold. The buyer will see the item is unavailable for hold.",
        details: [
          { label: "Product", value: productTitle },
          { label: "Buyer", value: `${hold.buyer_name || "Buyer"}` },
          { label: "Reason", value: reason },
        ],
        accentColor: "#dc2626",
      })
    );
    return;
  }

  // If no action query param provided, show prompt with two buttons
  res.status(200).type("html").send(
    renderCardHtml({
      title: "Action Required",
      badge: { text: "PENDING", bg: "#fef3c7", color: "#b45309" },
      heading: "Confirm or Decline Hold",
      message: `Please confirm if you can hold <strong>${productTitle}</strong> (${priceStr}) for <strong>${hold.buyer_name || "Buyer"}</strong>.`,
      details: [
        { label: "Product", value: productTitle },
        { label: "Price", value: priceStr },
        { label: "Buyer", value: `${hold.buyer_name || "Buyer"} (${hold.buyer_phone})` },
      ],
      accentColor: "#2563eb",
    })
  );
};
