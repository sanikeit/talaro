import { Module } from "@medusajs/framework/utils";
import SellerInviteModuleService from "./service";

export const SELLER_INVITE_MODULE = "seller_invite";

export default Module(SELLER_INVITE_MODULE, {
  service: SellerInviteModuleService,
});
