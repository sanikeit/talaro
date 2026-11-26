import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { applyRateLimit } from "../../../utils/rate-limiter";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!applyRateLimit(req, res, 60)) {
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

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

  // Load sellers with status='open'
  const { data: rawSellers } = await query.graph({
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
      status: "open",
    },
  });

  // Filter in memory for city/pincode from linked address
  const filtered = (rawSellers || []).filter((s: any) => {
    if (s.status !== "open") {
      return false;
    }

    if (cityFilter) {
      const sellerCity = s.address?.city?.toLowerCase();
      if (!sellerCity || sellerCity !== cityFilter) {
        return false;
      }
    }

    if (pincodeFilter) {
      const sellerPincode = s.address?.postal_code;
      if (!sellerPincode || sellerPincode !== pincodeFilter) {
        return false;
      }
    }

    return true;
  });

  const totalCount = filtered.length;
  const paged = filtered.slice(offset, offset + limit);

  const sellers = paged.map((s: any) => ({
    id: s.id,
    name: s.name,
    handle: s.handle,
    description: s.description || null,
    logo: s.logo || null,
    banner: s.banner || null,
    city: s.address?.city || null,
    pincode: s.address?.postal_code || null,
    phone: s.phone || null,
    whatsapp_phone: s.phone || null,
    delivery_available: false,
    verification_tier: s.seller_referral?.verification_tier || "INCOMPLETE",
    created_at: new Date(s.created_at).toISOString(),
  }));

  res.json({
    sellers,
    count: totalCount,
    limit,
    offset,
  });
};
