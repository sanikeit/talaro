import { model } from "@medusajs/framework/utils";

export const SellerReferral = model.define("seller_referral", {
  id: model.id({ prefix: "sref" }).primaryKey(),
  // Derived cache — set atomically with the corresponding remote link. Canonical source: seller_seller_seller_referral_seller_referral.
  seller_id: model.text().unique(),
  referred_by_seller_id: model.text().nullable(),
  invite_id: model.text().nullable(),
  verification_tier: model.text().default("INCOMPLETE"),
  invite_quota: model.number().default(0),
  invite_quota_resets_at: model.dateTime().nullable(),
  penalty_reason: model.text().nullable(),
});

export default SellerReferral;
