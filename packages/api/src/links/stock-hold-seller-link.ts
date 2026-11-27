import { defineLink } from "@medusajs/framework/utils";
import seller from "@mercurjs/core/modules/seller";
import sellerHold from "../modules/seller-hold";

export default defineLink(
  seller.linkable.seller,
  { linkable: sellerHold.linkable.stockHold, isList: true }
);
