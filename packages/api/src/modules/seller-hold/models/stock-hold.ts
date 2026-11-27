import { model } from "@medusajs/framework/utils";

export const StockHold = model
  .define("stock_hold", {
    id: model.id({ prefix: "hold" }).primaryKey(),
    offer_id: model.text().searchable(),
    seller_id: model.text().searchable(),
    buyer_phone: model.text().searchable(),
    buyer_name: model.text().nullable(),
    status: model.text().default("requested"), // requested | confirmed | rejected | expired | cancelled | picked_up
    token: model.text().unique().searchable(), // Secure nanoid for buyer pass /h/<token>
    seller_token: model.text().unique().searchable(), // 1-click token for seller actions
    requested_at: model.dateTime(),
    responded_at: model.dateTime().nullable(),
    expires_at: model.dateTime().nullable(),
    seller_action: model.text().nullable(), // confirm | reject | timeout
    rejection_reason: model.text().nullable(),
    buyer_contact_clicked_at: model.dateTime().nullable(),
    notes: model.text().nullable(),
  })
  .indexes([
    {
      name: "idx_stock_hold_offer_status",
      on: ["offer_id", "status"],
    },
    {
      name: "idx_stock_hold_seller_status",
      on: ["seller_id", "status"],
    },
    {
      name: "idx_stock_hold_buyer_phone_status",
      on: ["buyer_phone", "status"],
    },
    {
      name: "idx_stock_hold_status_expires",
      on: ["status", "expires_at"],
    },
    {
      name: "idx_stock_hold_token",
      on: ["token"],
    },
    {
      name: "idx_stock_hold_seller_token",
      on: ["seller_token"],
    },
  ]);

export default StockHold;
