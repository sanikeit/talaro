import { defineLink } from "@medusajs/framework/utils";
import fulfillment from "@medusajs/medusa/fulfillment";
import seller from "@mercurjs/core/modules/seller";

export default defineLink(
  { linkable: fulfillment.linkable.shippingProfile, isList: true },
  seller.linkable.seller
);
