import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { SellerStatus } from "@mercurjs/types";
import { createSellerWithInviteWorkflow } from "../../../workflows/seller/create-seller-with-invite";

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const memberId = (req as any).auth_context?.actor_id;
  if (!memberId) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      "You must be authenticated to access seller information."
    );
  }
  const { data: sellerMembers, metadata } = await query.graph({
    entity: "seller_member",
    fields: (req as any).queryConfig?.fields || ["*"],
    filters: {
      member_id: memberId,
      seller: {
        status: {
          $ne: SellerStatus.TERMINATED,
        },
      },
    },
    pagination: (req as any).queryConfig?.pagination,
  });
  res.json({
    seller_members: sellerMembers,
    count: metadata?.count ?? sellerMembers.length,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 20,
  });
};

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const invite = (req as any).invite;
  if (!invite) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "Seller registration is invite-only. Send a valid invite code in the 'x-invite-code' header."
    );
  }

  const {
    address,
    professional_details,
    payment_details,
    member_email,
    first_name,
    last_name,
    additional_data,
    ...sellerData
  } = (req as any).validatedBody || (req.body as any);

  const memberId = (req as any).auth_context?.actor_id || undefined;
  if (!memberId && !member_email) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "member_email is required when creating a seller without an existing member"
    );
  }

  const { result: seller } = await createSellerWithInviteWorkflow(req.scope).run({
    input: {
      invite_id: invite.id,
      seller_request_id: invite.request_id || undefined,
      auth_identity_id: (req as any).auth_context?.auth_identity_id,
      member_id: memberId,
      seller: sellerData,
      member_email,
      first_name: first_name ?? undefined,
      last_name: last_name ?? undefined,
      address,
      professional_details,
      payment_details,
      additional_data,
    },
  });

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: updatedSellers } = await query.graph({
    entity: "seller",
    fields: ["*"],
    filters: { id: seller.id },
  });

  res.status(201).json({ seller: updatedSellers?.[0] || seller });
};
