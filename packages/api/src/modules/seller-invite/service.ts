import { MedusaService } from "@medusajs/framework/utils";
import SellerInvite from "./models/seller-invite";
import SellerRequest from "./models/seller-request";

export default class SellerInviteModuleService extends MedusaService({
  SellerInvite,
  SellerRequest,
}) {}
