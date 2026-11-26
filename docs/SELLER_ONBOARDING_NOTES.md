# Seller Onboarding Architecture & Technical Debt Notes

This document captures architecture notes, known limitations, and scheduled improvements for the seller onboarding and invite subsystem (`seller_invite`, `seller_request`, `seller_referral`, and `createSellerWithInviteWorkflow`).

---

## 1. Multi-Process Concurrency & Horizontal Scaling

### Current State
In single-instance deployments, concurrent registrations with the same single-use invite code are serialized using an in-memory promise mutex (`acquireInviteLock` / `releaseInviteLockStep`) keyed by `invite_id` in `packages/api/src/workflows/seller/create-seller-with-invite.ts`.

In Step 1 (`lockAndValidateInviteStep`), a raw Knex `SELECT ... FOR UPDATE` query is issued. However, in Medusa v2, workflow steps run outside a single unified multi-step database transaction by default. Therefore, the PostgreSQL row lock from Step 1 is released at the completion of Step 1, before Step 3 (`consumeInviteStep`) executes its read-modify-write update. The in-memory mutex currently provides the isolation preventing race conditions.

### Limitation Under Horizontal Scaling
When scaling horizontally across multiple Node.js processes or Kubernetes pods, the process-local in-memory mutex does not span instances. Two concurrent requests arriving at different pods could both validate the invite in Step 1 before either pod completes Step 3.

### Scheduled Fix (Horizontal Scaling)
Replace the separate Step 1 check and Step 3 read-modify-write with an atomic conditional SQL statement in `consumeInviteStep`:

```sql
UPDATE seller_invite
SET use_count = use_count + 1,
    used_at = NOW(),
    used_by_seller_id = $1,
    status = CASE 
      WHEN use_count + 1 >= max_uses THEN 'expired' 
      ELSE status 
    END
WHERE id = $2
  AND deleted_at IS NULL
  AND use_count < max_uses
  AND status = 'active'
  AND expires_at > NOW()
RETURNING *;
```

If 0 rows are returned, inspect the row state or throw a 403 `MedusaError` indicating the invite was already consumed, expired, or invalid. This provides row-level ACID safety natively in PostgreSQL across any number of pods without requiring distributed locks or in-memory mutexes.

---

## 2. Hook Execution Lifecycle & Double Invocation

### Current State
`handleSellerCreated` (which auto-seeds a default shipping profile and links the default INR region) is invoked twice during the registration workflow:
1. Automatically inside Step 2 (`createSellerAccountWorkflow.runAsStep`) via the registered Medusa workflow hook `createSellerAccountWorkflow.hooks.sellerCreated()` defined in `packages/api/src/workflows/hooks/seller-created.ts`.
2. Explicitly inside Step 4 (`recordReferralStep`) in `packages/api/src/workflows/seller/create-seller-with-invite.ts` as a defensive guarantee.

### Impact & Cleanup
Both executions verify whether the seller already has an existing shipping profile link (`fulfillment_shipping_profile_seller_seller`) and region link (`region_seller`) prior to taking action. As a result, the operation is completely idempotent and harmless, but causes redundant database queries.

During upcoming workflow refactoring, the explicit call inside Step 4 can be removed.

---

## 3. Seller Referral Quota Reset Lifecycle (`invite_quota_resets_at`)

### Current State
In `packages/api/src/workflows/seller/create-seller-with-invite.ts` (`recordReferralStep`), the initial `seller_referral` record is created with:
- `verification_tier`: `'INCOMPLETE'`
- `invite_quota`: `0`
- `invites_issued`: `0`
- `invite_quota_resets_at`: `null` (not currently initialized)

### Scheduled Requirement (Prompt 9)
The monthly referral quota reset mechanism expects `invite_quota_resets_at` to represent the next reset timestamp (initially 30 days post-creation). Without this field set, lazy quota resets will not trigger for new sellers.

### Required Actions in Prompt 9:
1. **In `recordReferralStep` (`create-seller-with-invite.ts`)**:
   Set `invite_quota_resets_at` upon creation:
   ```typescript
   invite_quota_resets_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
   ```
2. **Backfill Existing Rows**:
   Run an SQL migration/backfill script to initialize all existing records:
   ```sql
   UPDATE seller_referral
   SET invite_quota_resets_at = created_at + INTERVAL '30 days'
   WHERE invite_quota_resets_at IS NULL;
   ```

---

## 4. `seller_invite.role` Usage

### Note
The `role` field on admin-created invites is currently populated with `'seller'`, but the gate middleware (`requireSellerInviteCode`) does not evaluate or enforce it at consumption time.

### Future Context (Prompt 9)
Role semantics are reserved for Prompt 9 when seller-generated invites and quota enforcement are introduced:
- `seller_invite.role` is currently unused by the gate middleware. Reserved for Prompt 9 (seller-generated invites). Do not rely on it for access control until Prompt 9 lands.

---

## 5. Legacy Invites Without `request_id`

`request_id` was added to `seller_invite` in Migration `Migration20261124210328.ts` but intentionally not backfilled for existing legacy records. Existing invites have `request_id = NULL`.
- Consuming a legacy invite fires `console.warn: [optionalApproveStep] Legacy invite without request_id: <id>. Falling back to reviewed_by heuristic.`
- This warning is expected and temporary: legacy invites naturally expire within 14 days (`expires_at`), after which all active invites in circulation will have explicit `request_id` mappings.

---

## 6. Output & Response Constraints for Agents
- Do not re-paste full schema outputs or existing unchanged files in responses.
- Only deliver the newly introduced diffs, newly created files, and specific verification results requested by the prompt.


