import { Migration } from "@medusajs/framework/mikro-orm/migrations";

export class Migration20261124210328 extends Migration {

  override async up(): Promise<void> {
    this.addSql(`alter table if exists "seller_invite" add column if not exists "request_id" text null;`);
  }

  override async down(): Promise<void> {
    this.addSql(`alter table if exists "seller_invite" drop column if exists "request_id";`);
  }

}
