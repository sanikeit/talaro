import { MedusaService } from "@medusajs/framework/utils";
import StockHold from "./models/stock-hold";

export default class SellerHoldModuleService extends MedusaService({
  StockHold,
}) {}
