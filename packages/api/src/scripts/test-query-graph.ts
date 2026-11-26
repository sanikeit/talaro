import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

export default async function testQueryGraph({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  
  try {
    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: [
        "id",
        "name",
        "handle",
        "status",
        "description",
        "logo",
        "banner",
        "phone",
        "created_at",
        "address.*",
        "seller_referral.*"
      ],
      filters: { status: "open" }
    });
    console.log("OPEN SELLERS COUNT:", sellers.length);
    if (sellers.length > 0) {
      console.log("FIRST SELLER SAMPLE:", JSON.stringify(sellers[0], null, 2));
    }
  } catch (err) {
    console.error("SELLER QUERY ERROR:", err);
  }

  try {
    const { data: offers } = await query.graph({
      entity: "offer",
      fields: [
        "id",
        "sku",
        "product_id",
        "variant_id",
        "seller_id",
        "product.*",
        "product.variants.*",
        "prices.*",
        "seller.*"
      ],
      pagination: { take: 2 }
    });
    console.log("OFFERS COUNT:", offers.length);
    if (offers.length > 0) {
      console.log("FIRST OFFER SAMPLE:", JSON.stringify(offers[0], null, 2));
    }
  } catch (err) {
    console.error("OFFER QUERY ERROR:", err);
  }
}
