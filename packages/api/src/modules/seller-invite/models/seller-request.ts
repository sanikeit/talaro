import { model } from "@medusajs/framework/utils";

export const SellerRequest = model
  .define("seller_request", {
    id: model.id({ prefix: "sreq" }).primaryKey(),
    business_name: model.text(),
    contact_name: model.text(),
    phone: model.text(),
    city: model.text(),
    pincode: model.text(),
    shop_front_photo_url: model.text(),
    bill_book_photo_url: model.text(),
    gstin: model.text().nullable(),
    notes: model.text().nullable(),
    status: model.text().default("pending"),
    reviewed_by: model.text().nullable(),
    reviewed_at: model.dateTime().nullable(),
    rejection_reason: model.text().nullable(),
  })
  .indexes([
    {
      name: "idx_seller_request_status",
      on: ["status"],
      where: "deleted_at IS NULL",
    },
    {
      name: "idx_seller_request_phone",
      on: ["phone"],
    },
  ]);

export default SellerRequest;
