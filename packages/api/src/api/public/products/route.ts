import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { applyRateLimit } from "../../../utils/rate-limiter";

interface ProductSellerGroup {
  id: string;
  title: string;
  thumbnail: string | null;
  description: string | null;
  created_at: string;
  min_price: number;
  seller: {
    id: string;
    handle: string;
    name: string;
    city: string | null;
    phone: string | null;
    whatsapp_phone: string | null;
  };
  offers: Array<{
    id: string;
    price: number;
    currency: string;
    stock_status: string;
  }>;
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!applyRateLimit(req, res, 60)) {
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const q =
    typeof req.query.q === "string" ? req.query.q.trim().toLowerCase() : undefined;
  const sellerHandle =
    typeof req.query.seller_handle === "string"
      ? req.query.seller_handle.trim().toLowerCase()
      : undefined;
  const cityFilter =
    typeof req.query.city === "string" ? req.query.city.trim().toLowerCase() : undefined;
  const pincodeFilter =
    typeof req.query.pincode === "string" ? req.query.pincode.trim() : undefined;

  let limit = parseInt(req.query.limit as string, 10);
  if (isNaN(limit) || limit <= 0) {
    limit = 20;
  }
  if (limit > 100) {
    limit = 100;
  }

  let offset = parseInt(req.query.offset as string, 10);
  if (isNaN(offset) || offset < 0) {
    offset = 0;
  }

  // Query offers with products, variants, prices, and seller
  const { data: offers } = await query.graph({
    entity: "offer",
    fields: [
      "id",
      "sku",
      "created_at",
      "deleted_at",
      "product_id",
      "variant_id",
      "product.id",
      "product.title",
      "product.thumbnail",
      "product.description",
      "product.status",
      "product.deleted_at",
      "product.created_at",
      "product.variants.id",
      "product.variants.sku",
      "product.variants.title",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
      "prices.deleted_at",
      "seller.id",
      "seller.name",
      "seller.handle",
      "seller.phone",
      "seller.status",
      "seller.deleted_at",
      "seller.address.*",
    ],
    filters: {
      deleted_at: null,
    },
  });

  // Filter offers
  const matchingOffers = (offers || []).filter((offer: any) => {
    if (!offer || offer.deleted_at) return false;

    const seller = offer.seller;
    if (!seller || seller.status !== "open" || seller.deleted_at) {
      return false;
    }

    const product = offer.product;
    if (!product || product.deleted_at) {
      return false;
    }

    if (sellerHandle && seller.handle?.toLowerCase() !== sellerHandle) {
      return false;
    }

    if (cityFilter) {
      const sellerCity = seller.address?.city?.toLowerCase();
      if (!sellerCity || sellerCity !== cityFilter) {
        return false;
      }
    }

    if (pincodeFilter) {
      const sellerPincode = seller.address?.postal_code;
      if (!sellerPincode || sellerPincode !== pincodeFilter) {
        return false;
      }
    }

    if (q) {
      const titleMatch = product.title?.toLowerCase().includes(q);
      const offerSkuMatch = offer.sku?.toLowerCase().includes(q);
      const variantSkuMatch =
        Array.isArray(product.variants) &&
        product.variants.some((v: any) => v && v.sku?.toLowerCase().includes(q));

      if (!titleMatch && !offerSkuMatch && !variantSkuMatch) {
        return false;
      }
    }

    return true;
  });

  // Group matched offers by product.id and seller.id
  const groupMap = new Map<string, ProductSellerGroup>();

  for (const offer of matchingOffers) {
    const prod = offer.product;
    const seller = offer.seller;
    if (!prod || !seller) continue;

    // Filter to INR-only prices
    const inrPrices = Array.isArray(offer.prices)
      ? offer.prices.filter(
          (p: any) =>
            p &&
            !p.deleted_at &&
            typeof p.amount === "number" &&
            (p.currency_code || "").toLowerCase() === "inr"
        )
      : [];

    // Exclude offer if it has no INR price
    if (inrPrices.length === 0) {
      continue;
    }

    inrPrices.sort((a: any, b: any) => a.amount - b.amount);
    const offerPrice = inrPrices[0]?.amount ?? 0;
    const offerCurrency = "inr";

    const key = `${prod.id}::${seller.id}`;

    let group = groupMap.get(key);
    if (!group) {
      group = {
        id: prod.id,
        title: prod.title || "",
        thumbnail: prod.thumbnail || null,
        description: prod.description || null,
        created_at: prod.created_at
          ? new Date(prod.created_at).toISOString()
          : new Date(offer.created_at).toISOString(),
        min_price: Infinity,
        seller: {
          id: seller.id,
          handle: seller.handle,
          name: seller.name,
          city: seller.address?.city || null,
          phone: seller.phone || null,
          whatsapp_phone: seller.phone || null,
        },
        offers: [],
      };
      groupMap.set(key, group);
    }

    if (offerPrice < group.min_price) {
      group.min_price = offerPrice;
    }

    // TODO: wire to inventory_level.available_quantity when inventory checks ship.
    const stockStatus = "unknown";

    group.offers.push({
      id: offer.id,
      price: offerPrice,
      currency: offerCurrency,
      stock_status: stockStatus,
    });
  }

  // Filter to only groups with at least one INR offer
  const allGroups = Array.from(groupMap.values()).filter(
    (g) => g.offers.length > 0
  );

  // Sort by min_price ASC, then created_at DESC
  allGroups.sort((a, b) => {
    const priceA = a.min_price === Infinity ? 0 : a.min_price;
    const priceB = b.min_price === Infinity ? 0 : b.min_price;
    if (priceA !== priceB) {
      return priceA - priceB;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const totalCount = allGroups.length;
  const pagedGroups = allGroups.slice(offset, offset + limit);

  const products = pagedGroups.map((g) => ({
    id: g.id,
    title: g.title,
    thumbnail: g.thumbnail,
    description: g.description,
    seller: g.seller,
    offers: g.offers,
    matched_offer_count: g.offers.length,
  }));

  res.json({
    products,
    count: totalCount,
    limit,
    offset,
  });
};
