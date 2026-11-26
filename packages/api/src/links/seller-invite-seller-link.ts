import { defineLink } from "@medusajs/framework/utils";
import seller from "@mercurjs/core/modules/seller";
import sellerInvite from "../modules/seller-invite";

export default defineLink(
  seller.linkable.seller,
  { linkable: sellerInvite.linkable.sellerInvite, isList: true }
);
