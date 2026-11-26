import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SELLER_INVITE_MODULE } from "../../../modules/seller-invite";

function isValidUrl(val: string): boolean {
  try {
    const url = new URL(val);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const body = req.body as Record<string, any> | undefined;

  if (!body) {
    res.status(400).json({ message: "Request body is required" });
    return;
  }

  // 1. Required fields check
  const requiredFields = [
    "business_name",
    "contact_name",
    "phone",
    "city",
    "pincode",
    "shop_front_photo_url",
    "bill_book_photo_url",
  ];

  for (const field of requiredFields) {
    const val = body[field];
    if (val === undefined || val === null || (typeof val === "string" && !val.trim())) {
      res.status(400).json({ message: `Field '${field}' is required` });
      return;
    }
  }

  // 2. Validate photo URLs
  if (!isValidUrl(body.shop_front_photo_url)) {
    res.status(400).json({ message: "Field 'shop_front_photo_url' must be a valid URL" });
    return;
  }
  if (!isValidUrl(body.bill_book_photo_url)) {
    res.status(400).json({ message: "Field 'bill_book_photo_url' must be a valid URL" });
    return;
  }

  // 3. Phone validation and normalization
  const rawPhone = String(body.phone).trim();
  const cleanedPhone = rawPhone.replace(/[\s\-\(\)]/g, "");
  let tenDigits = "";

  if (/^\+91[0-9]{10}$/.test(cleanedPhone)) {
    tenDigits = cleanedPhone.slice(3);
  } else if (/^91[0-9]{10}$/.test(cleanedPhone)) {
    tenDigits = cleanedPhone.slice(2);
  } else if (/^0[0-9]{10}$/.test(cleanedPhone)) {
    tenDigits = cleanedPhone.slice(1);
  } else if (/^[0-9]{10}$/.test(cleanedPhone)) {
    tenDigits = cleanedPhone;
  } else {
    res.status(400).json({
      message: "Invalid phone number. Must be a 10-digit Indian phone number",
    });
    return;
  }

  const normalizedPhone = `+91${tenDigits}`;

  const sellerInviteService = req.scope.resolve(SELLER_INVITE_MODULE) as any;

  // 4. Rate limiting: max 3 requests per phone number per hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentRequests = await sellerInviteService.listSellerRequests({
    phone: normalizedPhone,
    created_at: { $gte: oneHourAgo },
  });

  if (recentRequests && recentRequests.length >= 3) {
    res.status(429).json({
      message: "Rate limit exceeded. Maximum 3 requests per phone number per hour",
    });
    return;
  }

  // 5. Create seller request record
  const [created] = await sellerInviteService.createSellerRequests([
    {
      business_name: String(body.business_name).trim(),
      contact_name: String(body.contact_name).trim(),
      phone: normalizedPhone,
      city: String(body.city).trim(),
      pincode: String(body.pincode).trim(),
      shop_front_photo_url: String(body.shop_front_photo_url).trim(),
      bill_book_photo_url: String(body.bill_book_photo_url).trim(),
      gstin: body.gstin ? String(body.gstin).trim() : null,
      notes: body.notes ? String(body.notes).trim() : null,
      status: "pending",
    },
  ]);

  // 6. Return response (id, status, created_at only - no phone or internal fields)
  res.status(201).json({
    seller_request: {
      id: created.id,
      status: created.status,
      created_at: created.created_at,
    },
  });
}
