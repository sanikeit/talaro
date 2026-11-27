import { defineLink } from "@medusajs/framework/utils";
import offer from "@mercurjs/core/modules/offer";
import sellerHold from "../modules/seller-hold";

export default defineLink(
  offer.linkable.offer,
  { linkable: sellerHold.linkable.stockHold, isList: true }
);
