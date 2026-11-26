import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261124134302 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_referral" drop constraint if exists "seller_referral_seller_id_unique";`);
    this.addSql(`create table if not exists "seller_referral" ("id" text not null, "seller_id" text not null, "referred_by_seller_id" text null, "invite_id" text null, "verification_tier" text not null default 'INCOMPLETE', "invite_quota" integer not null default 0, "invite_quota_resets_at" timestamptz null, "created_at" timestamptz not null default now(), "updated_at" timestamptz not null default now(), "deleted_at" timestamptz null, constraint "seller_referral_pkey" primary key ("id"));`);
    this.addSql(`CREATE UNIQUE INDEX IF NOT EXISTS "IDX_seller_referral_seller_id_unique" ON "seller_referral" ("seller_id") WHERE deleted_at IS NULL;`);
    this.addSql(`CREATE INDEX IF NOT EXISTS "IDX_seller_referral_deleted_at" ON "seller_referral" ("deleted_at") WHERE deleted_at IS NULL;`);
  }

  override async down(): Promise<void> {
    this.addSql(`drop table if exists "seller_referral" cascade;`);
  }

}
