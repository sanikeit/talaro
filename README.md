# Talaro

A verified, referral-only supplier network for local commerce. Buyers search, contact sellers directly on WhatsApp, no middlemen.

[![License](https://img.shields.io/badge/license-All%20Rights%20Reserved-blue.svg)](LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22.0.0-brightgreen.svg)](https://nodejs.org)
[![Bun Version](https://img.shields.io/badge/bun-%3E%3D1.2.0-black.svg)](https://bun.sh)

## What Talaro is

Talaro is a hyperlocal discovery network connecting verified local suppliers directly with buyers and businesses. Sellers cannot simply register; they can only join via admin invite or referral from an existing verified seller with active referral quota. Every shop undergoes verification (shop-front photo, invoice/bill-book verification, and proof of legitimate local inventory). Buyers search for products across verified sellers in their area, compare local INR pricing, and connect directly on WhatsApp to negotiate and finalize orders. The platform operates strictly as a discovery and connection layer—there are no online carts, checkouts, or platform payment processing fees.

## Why this exists

In India's Tier 2 and Tier 3 markets, national e-commerce platforms ship items from distant metropolitan warehouses over multiple days, whereas trusted neighborhood wholesalers and shops already hold immediate stock on their shelves. Talaro connects local buyers directly with nearby suppliers, providing real-time stock discovery with the immediacy of same-day local pickup and direct WhatsApp communication.

## Key features

- **Invite-Gated Seller Onboarding:** Sellers register strictly using database-backed invite codes from platform admins or verified peer referrals.
- **Referral Quota & Reputation:** Verified sellers earn referral quotas based on tenure and standing; if a referred seller is suspended, their referrer's standing and quotas are penalized.
- **Public Local Search:** Buyer-facing search endpoints and storefront interface supporting city and PIN code filtering, returning only active, INR-priced offers.
- **INR-Only Commerce Lock:** Offers and pricing are restricted to Indian Rupees (`INR`), preventing cross-currency errors during the pilot.
- **WhatsApp Direct Interaction:** Deep links from seller shop profiles and individual product listings directly launch WhatsApp chats pre-populated with seller and product context.
- **Server-Side Rendered Storefront:** High-performance buyer storefront built on Next.js 16 with App Router, featuring responsive seller profiles, catalog grids, and dynamic metadata.

## Architecture

- **Backend:** MedusaJS v2 extended with Mercur marketplace modular framework.
- **Storefront:** Next.js 16 with React 19 and Tailwind CSS.
- **Database:** PostgreSQL with transactional schema links between seller profiles, addresses, and invite logs.
- **Runtime:** Bun 1.2+ or Node.js 22+.
- **Domain Flows:** Seller invite verification → multi-step registration workflow → address synchronization → referral quota validation → public rate-limited read API.

> **Note on Commerce Features:** Standard e-commerce features (cart, checkout, payment gateways, and order management) are intentionally disabled in this build. Deals close off-platform directly between buyers and sellers on WhatsApp.

## Roadmap / Not Yet Built

The following capabilities are planned for subsequent phases and are **not** present in the current release:
- **24-Hour Hold:** Requesting inventory holds directly from seller storefront cards.
- **RFQ Routing:** Broadcasting requests for quotation to multiple verified vendors in a district.
- **Dedicated Mobile App:** Native Android and iOS applications for buyers and sellers.
- **AI & Structured Data Integration:** Dedicated Model Context Protocol (MCP) server endpoints, `llms.txt`, and rich JSON-LD catalog feeds.
- **In-Platform Checkout & Escrow:** On-platform digital payments and order settlement workflows.

## Development & Testing Credentials

For local development and testing only:
- **Admin Dashboard:** `admin@talaro.local` / `supersecret` (Local development only — do not deploy with these values.)
- **Vendor Portal:** `seller@talaro.local` / `supersecret` (Local development only — do not deploy with these values.)

Production environments enforce explicit environment variables and require unique administrator credentials.

## Getting started

### Prerequisites

- **Node.js:** `>= 22.0.0`
- **Bun:** `>= 1.2.0`
- **PostgreSQL:** `>= 14.0`

### Install & Run

1. Clone the repository:
   ```bash
   git clone https://github.com/sanikeit/talaro.git
   cd talaro
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Configure environment variables:
   ```bash
   cp packages/api/.env.template packages/api/.env
   cp apps/storefront/.env.template apps/storefront/.env.local
   ```

4. Seed bootstrap invites (local dev only):
   ```bash
   # Add bootstrap codes to packages/api/.env, then run:
   cd packages/api && bun run medusa exec ./src/scripts/seed-bootstrap-invites.ts
   ```

5. Seed demo sellers, products, and offers (local dev only):
   ```bash
   cd packages/api && bun run medusa exec ./src/scripts/seed.ts
   ```

6. Build all packages:
   ```bash
   bun run build
   ```

7. Start development servers:
   ```bash
   bun run dev
   ```

   - **Storefront:** http://localhost:8000
   - **Backend API:** http://localhost:9000
   - **Vendor Portal:** http://localhost:7001
   - **Admin Dashboard:** http://localhost:7002
