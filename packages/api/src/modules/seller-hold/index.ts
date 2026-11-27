import { Module } from "@medusajs/framework/utils";
import SellerHoldModuleService from "./service";

export const SELLER_HOLD_MODULE = "seller_hold";

export default Module(SELLER_HOLD_MODULE, {
  service: SellerHoldModuleService,
});
