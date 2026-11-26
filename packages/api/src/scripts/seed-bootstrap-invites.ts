import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { MercurModules } from "@mercurjs/types";
import { SELLER_INVITE_MODULE } from "../modules/seller-invite";

export const createSellerInviteWithLinkStep = createStep(
  "create-seller-invite-with-link-step",
  async (
    input: {
      code: string;
      created_by: string;
      referred_by_seller_id?: string | null;
      role?: string;
      max_uses?: number;
      use_count?: number;
      status?: string;
      expires_at: Date;
    },
    { container }
  ) => {
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    // 1. Create seller invite record
    const [invite] = await sellerInviteService.createSellerInvites([input]);

    // 2. If referred by a seller, atomically link in same transactional step
    if (input.referred_by_seller_id) {
      try {
        await remoteLink.create([
          {
            [MercurModules.SELLER]: { seller_id: input.referred_by_seller_id },
            [SELLER_INVITE_MODULE]: { seller_invite_id: invite.id },
          },
        ]);
      } catch (err) {
        await sellerInviteService.deleteSellerInvites([invite.id]);
        throw err;
      }
    }

    return new StepResponse(invite, {
      inviteId: invite.id,
      referrerSellerId: input.referred_by_seller_id,
    });
  },
  async (compensationData, { container }) => {
    if (!compensationData) return;
    const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;
    const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

    if (compensationData.referrerSellerId) {
      try {
        await remoteLink.dismiss([
          {
            [MercurModules.SELLER]: { seller_id: compensationData.referrerSellerId },
            [SELLER_INVITE_MODULE]: { seller_invite_id: compensationData.inviteId },
          },
        ]);
      } catch (_err) {}
    }
    await sellerInviteService.deleteSellerInvites([compensationData.inviteId]);
  }
);

export const createSellerInviteWorkflow = createWorkflow(
  "create-seller-invite-workflow",
  (input: {
    code: string;
    created_by: string;
    referred_by_seller_id?: string | null;
    role?: string;
    max_uses?: number;
    use_count?: number;
    status?: string;
    expires_at: Date;
  }) => {
    const invite = createSellerInviteWithLinkStep(input);
    return new WorkflowResponse(invite);
  }
);

export default async function seedBootstrapInvites({ container }: ExecArgs) {
  if (process.env.NODE_ENV === "production") {
    console.error("Refusing to seed bootstrap invites in production environment.");
    process.exit(1);
  }

  const rawCodes = process.env.BOOTSTRAP_INVITE_CODES;
  if (!rawCodes || !rawCodes.trim()) {
    console.error(
      "BOOTSTRAP_INVITE_CODES not set. This script will not create invite codes without explicit env configuration. See .env.example."
    );
    process.exit(1);
  }

  const codes = rawCodes
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);

  if (codes.length === 0) {
    console.error(
      "BOOTSTRAP_INVITE_CODES not set. This script will not create invite codes without explicit env configuration. See .env.example."
    );
    process.exit(1);
  }

  const sellerInviteService = container.resolve(SELLER_INVITE_MODULE) as any;

  console.log("=== Seeding Bootstrap Admin Invites ===");

  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // now + 1 year

  const bootstrapCodes = codes.map((code) => ({
    code,
    created_by: "system",
    referred_by_seller_id: null,
    role: "admin",
    max_uses: 20,
    use_count: 0,
    status: "active",
    expires_at: expiresAt,
  }));

  let createdCount = 0;
  for (const item of bootstrapCodes) {
    const existing = await sellerInviteService.listSellerInvites({
      code: item.code,
    });

    if (existing && existing.length > 0) {
      console.log(`Invite code '${item.code}' already exists, skipping.`);
      continue;
    }

    await createSellerInviteWorkflow(container).run({
      input: item,
    });
    createdCount++;
    console.log(`Created bootstrap invite code: '${item.code}'`);
  }

  console.log(`Bootstrap seeding complete. ${createdCount} invites created.`);
}
