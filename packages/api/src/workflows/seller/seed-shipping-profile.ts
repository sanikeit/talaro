import { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { MercurModules } from "@mercurjs/types";
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk";
import { createShippingProfilesWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Auto-links a seller to the store's default INR region via the region_seller link.
 * Idempotent: skips if the seller is already linked to the region.
 * If no INR region exists, logs a warning and skips (does not auto-create a region).
 */
export async function autoLinkSellerToRegion(
  container: MedusaContainer,
  sellerId: string
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  // 1. Query store's default region and check for INR region
  let targetRegionId: string | null = null;

  try {
    const { data: stores } = await query.graph({
      entity: "store",
      fields: [
        "id",
        "default_region_id",
        "default_region.id",
        "default_region.currency_code",
      ],
    });

    const defaultRegion = (stores?.[0] as any)?.default_region;
    if (
      defaultRegion &&
      defaultRegion.currency_code?.toLowerCase() === "inr"
    ) {
      targetRegionId = defaultRegion.id as string;
    }
  } catch (_e) {
    // Continue to fallback region query
  }

  // If default region is not INR, query all regions for currency INR
  if (!targetRegionId) {
    try {
      const { data: inrRegions } = await query.graph({
        entity: "region",
        fields: ["id", "name", "currency_code"],
        filters: {
          currency_code: "inr",
        },
      });

      if (inrRegions && inrRegions.length > 0) {
        targetRegionId = inrRegions[0].id as string;
      }
    } catch (_e) {
      // Query error
    }
  }

  // If no INR region exists, log warning and skip (do not auto-create)
  if (!targetRegionId) {
    console.warn(
      `[seed-seller] No INR region exists. Skipping auto-linking seller ${sellerId} to region. Store owner must create an INR region first.`
    );
    return null;
  }

  // 2. Idempotency: check if seller is already linked to this region
  try {
    const { data: existingLinks } = await query.graph({
      entity: "region",
      fields: ["id", "seller.id"],
      filters: {
        id: targetRegionId,
        seller: { id: sellerId },
      } as any,
    });

    if (existingLinks && existingLinks.length > 0) {
      return targetRegionId;
    }
  } catch (_e) {
    // Continue to link creation
  }

  // 3. Link seller to region via region_seller remote link
  try {
    await remoteLink.create([
      {
        [Modules.REGION]: {
          region_id: targetRegionId,
        },
        [MercurModules.SELLER]: {
          seller_id: sellerId,
        },
      },
    ]);
  } catch (_err) {
    // Already linked or primary key conflict
  }

  return targetRegionId;
}

/**
 * Idempotently seeds a default shipping profile for a seller and links it
 * via the fulfillment_shipping_profile_seller_seller remote link.
 */
export async function seedSellerShippingProfile(
  container: MedusaContainer,
  seller: { id: string; name?: string }
): Promise<{ id: string; name: string }> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  let sellerName = seller.name;
  if (!sellerName) {
    const { data: sellers } = await query.graph({
      entity: "seller",
      fields: ["id", "name"],
      filters: { id: seller.id },
    });
    sellerName = sellers?.[0]?.name || "Seller";
  }

  // 1. Idempotency check: see if a shipping profile is already linked to this seller via link table
  try {
    const { data: linkedProfiles } = await query.graph({
      entity: "shipping_profile",
      fields: ["id", "name", "type", "seller.id"],
      filters: {
        seller: { id: seller.id },
      },
    });

    if (linkedProfiles && linkedProfiles.length > 0) {
      // Ensure region link is also established idempotently
      await autoLinkSellerToRegion(container, seller.id);
      return {
        id: linkedProfiles[0].id as string,
        name: linkedProfiles[0].name as string,
      };
    }
  } catch (_e) {
    // Continue if link query encounters an issue
  }

  // 2. Collision-safe profile naming: <sellerName> (<seller_id_short>) Default Profile
  const sellerIdShort = seller.id.slice(-6);
  const profileName = `${sellerName} (${sellerIdShort}) Default Profile`;

  // 3. Create the shipping profile with type "default"
  const {
    result: [createdProfile],
  } = await createShippingProfilesWorkflow(container).run({
    input: {
      data: [
        {
          name: profileName,
          type: "default",
        },
      ],
    },
  });
  const profileId = createdProfile.id;

  // 4. Link the shipping profile to the seller
  try {
    await remoteLink.create([
      {
        [Modules.FULFILLMENT]: {
          shipping_profile_id: profileId,
        },
        [MercurModules.SELLER]: {
          seller_id: seller.id,
        },
      },
    ]);
  } catch (_err) {
    // Already linked or link exists
  }

  // 5. Auto-link seller to store default INR region
  await autoLinkSellerToRegion(container, seller.id);

  return { id: profileId, name: profileName };
}

/**
 * Workflow step that can be composed into any Medusa workflow
 */
export const seedSellerShippingProfileStep = createStep(
  "seed-seller-shipping-profile",
  async (
    input: { seller_id: string; seller_name?: string },
    { container }
  ) => {
    const profile = await seedSellerShippingProfile(container, {
      id: input.seller_id,
      name: input.seller_name,
    });
    return new StepResponse(profile);
  }
);
