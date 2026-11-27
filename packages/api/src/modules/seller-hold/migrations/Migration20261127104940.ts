import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261127104940 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "stock_hold" drop constraint if exists "stock_hold_seller_token_unique";`);
    this.addSql(`alter table if exists "stock_hold" drop constraint if exists "stock_hold_token_unique";`);
    this.addSql(`create table if not exists "stock_hold" ("id" text not null, "offer_id" text not null, "seller_id" text not null, "buyer_phone" text not null, "buyer_name" text null, "status" text not null default 'requested', "token" text not null, "seller_token" text not null, "requested_at" timestamptz not null, "responded_at" timestamptz null, "expires_at" timestamptz null, "seller_action" text null, "rejection_reason" text null, "buyer_contact_clicked_at" timestamptz null, "notes" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "stock_hold_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_hold_token_unique" ON "stock_hold" ("token") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_stock_hold_seller_token_unique" ON "stock_hold" ("seller_token") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_stock_hold_deleted_at" ON "stock_hold" ("deleted_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_stock_hold_offer_status" ON "stock_hold" ("offer_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_stock_hold_seller_status" ON "stock_hold" ("seller_id", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_stock_hold_buyer_phone_status" ON "stock_hold" ("buyer_phone", "status") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_stock_hold_status_expires" ON "stock_hold" ("status", "expires_at") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_stock_hold_token" ON "stock_hold" ("token") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "idx_stock_hold_seller_token" ON "stock_hold" ("seller_token") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "stock_hold" cascade;`);
  }

}
