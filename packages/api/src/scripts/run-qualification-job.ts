import { ExecArgs } from "@medusajs/framework/types";
import { qualifySellersForQuota } from "../jobs/seller-quota-qualification";

export default async function runQualificationScript({ container }: ExecArgs) {
  console.log("Running qualifySellersForQuota...");
  const qualified = await qualifySellersForQuota(container);
  console.log("QUALIFIED_RESULT:", JSON.stringify(qualified));
}
