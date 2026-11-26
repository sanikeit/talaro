import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261124173350 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_seller_invite_referrer" ON "seller_invite" ("referred_by_seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_seller_invite_status_expires" ON "seller_invite" ("status", "expires_at") WHERE deleted_at IS NULL;`);

    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_seller_request_status" ON "seller_request" ("status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_seller_request_phone" ON "seller_request" ("phone") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "idx_seller_invite_referrer";`);
    this.addSql(`drop index if exists "idx_seller_invite_status_expires";`);

    this.addSql(`drop index if exists "idx_seller_request_status";`);
    this.addSql(`drop index if exists "idx_seller_request_phone";`);
  }

}
