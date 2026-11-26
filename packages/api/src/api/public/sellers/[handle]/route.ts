import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { applyRateLimit } from "../../../../utils/rate-limiter";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!applyRateLimit(req, res, 60)) {
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const handle = req.params.handle;

  if (!handle) {
    res.status(400).json({ message: "Handle is required" });
    return;
  }

  // 1. Resolve seller by handle
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: [
      "id",
      "name",
      "handle",
      "description",
      "logo",
      "banner",
      "phone",
      "status",
      "created_at",
      "address.*",
      "seller_referral.*",
    ],
    filters: {
      handle,
    },
  });

  const seller = sellers?.[0];

  // Only open sellers are visible. Suspended/terminated/pending → 404.
  if (!seller || seller.status !== "open") {
    res.status(404).json({
      type: "not_found",
      message: `Seller with handle '${handle}' not found or not active.`,
    });
    return;
  }

  // 2. Load active offers for this seller to compute products array
  const { data: offers } = await query.graph({
    entity: "offer",
    fields: [
      "id",
      "product_id",
      "variant_id",
      "deleted_at",
      "product.id",
      "product.title",
      "product.thumbnail",
      "product.status",
      "product.variants.id",
      "prices.amount",
      "prices.currency_code",
      "prices.deleted_at",
    ],
    filters: {
      seller_id: seller.id,
      deleted_at: null,
    },
  });

  const productMap = new Map<
    string,
    {
      id: string;
      title: string;
      thumbnail: string | null;
      variants_count: number;
      offers_count: number;
      prices: { amount: number; currency: string }[];
    }
  >();

  for (const offer of offers || []) {
    if (offer.deleted_at) continue;
    const prod = offer.product;
    if (!prod) continue;

    // Filter to INR prices only
    const inrPrices = Array.isArray(offer.prices)
      ? offer.prices.filter(
          (p: any) =>
            p &&
            !p.deleted_at &&
            typeof p.amount === "number" &&
            (p.currency_code || "").toLowerCase() === "inr"
        )
      : [];

    // If an offer has no INR price, skip that offer's price contribution entirely
    if (inrPrices.length === 0) {
      continue;
    }

    let entry = productMap.get(prod.id);
    if (!entry) {
      entry = {
        id: prod.id,
        title: prod.title || "",
        thumbnail: prod.thumbnail || null,
        variants_count: Array.isArray(prod.variants) ? prod.variants.length : 1,
        offers_count: 0,
        prices: [],
      };
      productMap.set(prod.id, entry);
    }

    entry.offers_count += 1;

    for (const p of inrPrices) {
      if (!p) continue;
      entry.prices.push({
        amount: p.amount,
        currency: "inr",
      });
    }
  }

  const products = Array.from(productMap.values())
    .filter((p) => p.prices.length > 0)
    .map((p) => {
      const amounts = p.prices.map((pr) => pr.amount);
      const minPrice = amounts.length > 0 ? Math.min(...amounts) : 0;
      const maxPrice = amounts.length > 0 ? Math.max(...amounts) : 0;

      return {
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        variants_count: p.variants_count,
        offers_count: p.offers_count,
        min_price: minPrice,
        max_price: maxPrice,
        currency: "inr",
      };
    });

  res.json({
    seller: {
      id: seller.id,
      name: seller.name,
      handle: seller.handle,
      description: seller.description || null,
      logo: seller.logo || null,
      banner: seller.banner || null,
      city: seller.address?.city || null,
      pincode: seller.address?.postal_code || null,
      phone: seller.phone || null,
      whatsapp_phone: seller.phone || null,
      delivery_available: false,
      verification_tier: seller.seller_referral?.verification_tier || "INCOMPLETE",
      created_at: new Date(seller.created_at).toISOString(),
    },
    products,
  });
};
