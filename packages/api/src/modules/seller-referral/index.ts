import { Module } from "@medusajs/framework/utils";
import SellerReferralModuleService from "./service";

export const SELLER_REFERRAL_MODULE = "seller_referral";

export default Module(SELLER_REFERRAL_MODULE, {
  service: SellerReferralModuleService,
});
