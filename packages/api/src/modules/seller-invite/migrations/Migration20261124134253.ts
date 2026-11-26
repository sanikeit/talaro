import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261124134253 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_invite" drop constraint if exists "seller_invite_code_unique";`);
    this.addSql(`create table if not exists "seller_invite" ("id" text not null, "code" text not null, "created_by" text not null, "referred_by_seller_id" text null, "role" text not null default 'seller', "max_uses" integer not null default 1, "use_count" integer not null default 0, "status" text not null default 'active', "expires_at" timestamptz not null, "used_at" timestamptz null, "used_by_seller_id" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_invite_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_invite_code_unique" ON "seller_invite" ("code") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_invite_deleted_at" ON "seller_invite" ("deleted_at") WHERE deleted_at IS NULL;`);

    this.addSql(`create table if not exists "seller_request" ("id" text not null, "business_name" text not null, "contact_name" text not null, "phone" text not null, "city" text not null, "pincode" text not null, "shop_front_photo_url" text not null, "bill_book_photo_url" text not null, "gstin" text null, "notes" text null, "status" text not null default 'pending', "reviewed_by" text null, "reviewed_at" timestamptz null, "rejection_reason" text null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_request_pkey" primary key ("id"));`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_request_deleted_at" ON "seller_request" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_invite" cascade;`);

    this.addSql(`drop table if exists "seller_request" cascade;`);
  }

}
