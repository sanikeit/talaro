import { model } from "@medusajs/framework/utils";

export const SellerInvite = model
  .define("seller_invite", {
    id: model.id({ prefix: "sinv" }).primaryKey(),
    code: model.text().unique().searchable(),
    created_by: model.text(),
    // Derived cache — set atomically with the corresponding remote link. Canonical source: seller_seller_seller_invite_seller_invite.
    referred_by_seller_id: model.text().nullable(),
    role: model.text().default("seller"),
    max_uses: model.number().default(1),
    use_count: model.number().default(0),
    status: model.text().default("active"),
    expires_at: model.dateTime(),
    used_at: model.dateTime().nullable(),
    used_by_seller_id: model.text().nullable(),
    request_id: model.text().nullable(),
  })
  .indexes([
    {
      name: "idx_seller_invite_referrer",
      on: ["referred_by_seller_id"],
      where: "deleted_at IS NULL",
    },
    {
      name: "idx_seller_invite_status_expires",
      on: ["status", "expires_at"],
    },
  ]);

export default SellerInvite;
