import { defineMiddlewares } from "@medusajs/framework/http";
import type {
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { seedSellerShippingProfile } from "../workflows/seller/seed-shipping-profile";
import { SELLER_INVITE_MODULE } from "../modules/seller-invite";
import { rateLimitMiddleware } from "../utils/rate-limiter";

// ---------------------------------------------------------------------------
// TASK 1 — Disabled vendor modules (connector-only v1)
// ---------------------------------------------------------------------------
// Routes in this list are blocked with 404 for all HTTP methods.
// KEEP list (not here): products, product-*, offers, offer-*, inventory-items,
//   collections, sellers, members, uploads, currencies, regions, feature-flags,
//   stores, sales-channels (pending), price-preferences (pending).
// ---------------------------------------------------------------------------
const DISABLED_VENDOR_MODULES: string[] = [
  // Order management
  "orders",
  "order-edits",
  "returns",
  "return-reasons",
  "claims",
  "exchanges",
  // Payments & payouts
  "payments",
  "payouts",
  "payout-accounts",
  // Shipping & fulfillment
  "shipping-profiles",
  "shipping-options",
  "shipping-option-types",
  "fulfillment-providers",
  "fulfillment-sets",
  "stock-locations",
  // Promotions & pricing tools
  "campaigns",
  "promotions",
  "price-lists",
  "customer-groups",
  // CRM / misc
  "customers",
  "reviews",
  "refund-reasons",
  "reservations",
];

const disabledModulePattern = new RegExp(
  `^/vendor/(${DISABLED_VENDOR_MODULES.join("|")})(/.*)?(\\?.*)?$`
);

function rejectDisabledRoute(_req: MedusaRequest, res: MedusaResponse): void {
  res.status(404).json({
    type: "not_found",
    message:
      "This route is disabled in connector-only mode. " +
      "If you need it, remove it from DISABLED_VENDOR_MODULES in packages/api/src/api/middlewares.ts.",
  });
}

// ---------------------------------------------------------------------------
// TASK 1 — Seller invite gate on POST /vendor/sellers (DB-backed)
// ---------------------------------------------------------------------------
// Queries seller_invite WHERE code = :header AND deleted_at IS NULL.
// Distinct 403 messages per failure mode. Attaches req.invite on success.
// ---------------------------------------------------------------------------
async function requireSellerInviteCode(
  req: MedusaRequest,
  _res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  const rawCode = req.headers["x-invite-code"];

  if (!rawCode || typeof rawCode !== "string" || !rawCode.trim()) {
    return next(
      new MedusaError(
        MedusaError.Types.FORBIDDEN,
        "Seller registration is invite-only. Send a valid invite code in the 'x-invite-code' header."
      )
    );
  }

  const code = rawCode.trim();
  const sellerInviteService = req.scope.resolve(SELLER_INVITE_MODULE) as any;

  try {
    const invites = await sellerInviteService.listSellerInvites({
      code,
    });

    const invite = invites?.[0];
    if (!invite) {
      return next(
        new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invalid invite code."
        )
      );
    }

    if (Number(invite.use_count) >= Number(invite.max_uses)) {
      return next(
        new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invite code has reached its maximum uses."
        )
      );
    }

    const now = new Date();
    if (new Date(invite.expires_at) <= now) {
      return next(
        new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invite code has expired."
        )
      );
    }

    if (invite.status !== "active") {
      return next(
        new MedusaError(
          MedusaError.Types.FORBIDDEN,
          "Invite code is no longer active."
        )
      );
    }

    (req as any).invite = invite;
    return next();
  } catch (err) {
    return next(err);
  }
}

// ---------------------------------------------------------------------------
// Auto-resolve Seller Default Shipping Profile on POST /vendor/offers
// ---------------------------------------------------------------------------
// Since /vendor/shipping-profiles is disabled (closing cross-tenant leak),
// sellers reference their shipping profile by ID internally. This middleware
// ensures:
// 1. If shipping_profile_id is missing or empty, it auto-resolves to the
//    seller's auto-seeded default shipping profile.
// 2. If product_id was provided instead of variant_id, it looks up the variant.
// 3. Removes product_id from body to satisfy strict CreateOffer schema.
// 4. Sets minimal defaults for inventory_items and prices if omitted.
// ---------------------------------------------------------------------------
async function resolveOfferShippingProfile(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  console.log("[resolveOfferShippingProfile] CALLED with body:", req.body);
  const sellerId =
    (req as any).seller_context?.seller_id ||
    (req.headers["x-seller-id"] as string);
  const body = req.body as Record<string, any> | undefined;

  if (!body) {
    return next();
  }

  // If product_id was sent without variant_id, lookup product's first variant
  if (body.product_id && !body.variant_id) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
      const { data: products } = await query.graph({
        entity: "product",
        fields: ["id", "variants.id"],
        filters: { id: body.product_id },
      });
      if (products?.[0]?.variants?.[0]?.id) {
        body.variant_id = products[0].variants[0].id;
      }
    } catch (_err) {}
  }

  // Strip product_id to satisfy strict schema validation
  delete body.product_id;

  // Auto-resolve shipping_profile_id if not explicitly provided
  if (sellerId && (!body.shipping_profile_id || !body.shipping_profile_id.trim())) {
    try {
      const profile = await seedSellerShippingProfile(req.scope, { id: sellerId });
      body.shipping_profile_id = profile.id;
    } catch (err) {
      console.error("[resolveOfferShippingProfile] Failed to seed/resolve shipping profile:", err);
    }
  }

  // Ensure inventory_items and prices defaults if omitted
  if (body.sku && (!body.inventory_items || !body.inventory_items.length)) {
    body.inventory_items = [{ sku: body.sku }];
  }
  if (!body.prices || !body.prices.length) {
    body.prices = [{ amount: 1000, currency_code: "inr" }];
  }

  // Reject non-INR prices
  if (Array.isArray(body.prices)) {
    const hasNonInr = body.prices.some(
      (p: any) => (p?.currency_code || "").toLowerCase() !== "inr"
    );
    if (hasNonInr) {
      res.status(400).json({
        type: "invalid_data",
        message:
          "Only INR (inr) offers are supported in this pilot. Remove non-INR prices from the request.",
      });
      return;
    }
  }

  return next();
}

// ---------------------------------------------------------------------------
// Route registration
// NOTE: The disabled-module matcher must come first so broad patterns are
// evaluated before the more specific invite-gate matcher.
// ---------------------------------------------------------------------------
export default defineMiddlewares({
  routes: [
    // --- Block all disabled vendor modules (all HTTP methods) ---
    {
      matcher: disabledModulePattern,
      middlewares: [rejectDisabledRoute],
    },
    // --- Seller invite gate (POST only) ---
    {
      matcher: "/vendor/sellers",
      method: ["POST"],
      middlewares: [requireSellerInviteCode],
    },
    // --- Auto-resolve shipping profile on offer creation ---
    {
      matcher: "/vendor/offers",
      method: ["POST"],
      middlewares: [resolveOfferShippingProfile],
    },
    // --- Public routes rate limiting (60 req/min) ---
    {
      matcher: "/public/*",
      middlewares: [rateLimitMiddleware(60)],
    },
  ],
});
