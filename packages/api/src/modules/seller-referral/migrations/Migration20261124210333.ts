import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261124210333 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_referral" add column if not exists "penalty_reason" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller_referral" drop column if exists "penalty_reason";`);
  }

}
