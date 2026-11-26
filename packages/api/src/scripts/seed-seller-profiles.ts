import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { seedSellerShippingProfile } from "../workflows/seller/seed-shipping-profile";

export default async function seedAllSellerProfiles({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data: sellers } = await query.graph({
    entity: "seller",
    fields: ["id", "name"],
  });

  console.log(`Found ${sellers.length} sellers to check/seed.`);
  for (const seller of sellers) {
    const profile = await seedSellerShippingProfile(container, {
      id: seller.id as string,
      name: seller.name as string,
    });
    console.log(
      `Seller "${seller.name}" (${seller.id}) -> Profile "${profile.name}" (${profile.id})`
    );
  }
}
