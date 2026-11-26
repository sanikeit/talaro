import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { SELLER_INVITE_MODULE } from "../../../modules/seller-invite";

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const sellerInviteService = req.scope.resolve(SELLER_INVITE_MODULE) as any;

  const status = (req.query.status as string) || "pending";
  const limit = Math.min(parseInt(req.query.limit as string, 10) || 20, 100);
  const offset = parseInt(req.query.offset as string, 10) || 0;

  const [sellerRequests, count] = await sellerInviteService.listAndCountSellerRequests(
    { status },
    {
      skip: offset,
      take: limit,
      order: { created_at: "DESC" },
    }
  );

  res.json({
    seller_requests: sellerRequests,
    count,
    limit,
    offset,
  });
}
