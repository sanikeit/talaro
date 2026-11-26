import { defineLink } from "@medusajs/framework/utils";
import seller from "@mercurjs/core/modules/seller";
import sellerReferral from "../modules/seller-referral";

export default defineLink(
  seller.linkable.seller,
  sellerReferral.linkable.sellerReferral
);
