import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createSellerAccountWorkflow,
  createSellersWorkflow,
} from "@mercurjs/core/workflows";
import { seedSellerShippingProfile } from "../seller/seed-shipping-profile";

/**
 * Common handler for seller creation hooks.
 * Guards against duplicate execution by checking if the seller already has an existing shipping profile link.
 */
export async function handleSellerCreated(
  container: MedusaContainer,
  seller?: { id?: string; name?: string }
) {
  if (!seller?.id) {
    return;
  }

  // Guard: only run when the seller has no existing profile link
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  try {
    const { data: linkedProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id", "seller.id"],
      filters: {
        seller: { id: seller.id },
      },
    });

    if (linkedProfiles && linkedProfiles.length > 0) {
      return;
    }
  } catch (_e) {
    // If graph query encounters an issue, proceed to seedSellerShippingProfile
  }

  await seedSellerShippingProfile(container, {
    id: seller.id,
    name: seller.name,
  });
}

// Hook into single seller account creation (POST /vendor/sellers)
createSellerAccountWorkflow.hooks.sellerAccountCreated(
  async ({ seller }, { container }) => {
    await handleSellerCreated(container, seller);
  }
);

// Hook into batch seller creation
createSellersWorkflow.hooks.sellersCreated(
  async ({ sellers }, { container }) => {
    if (Array.isArray(sellers)) {
      for (const seller of sellers) {
        await handleSellerCreated(container, seller);
      }
    }
  }
);
