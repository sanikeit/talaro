import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Become a Seller | Talaro",
  description: "Apply to become a verified hardware seller on Talaro.",
};

export default function BecomeASellerPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
          Seller Onboarding
        </span>
        <h1 className="text-4xl font-extrabold text-gray-900 mt-4 mb-3">
          Sell to Thousands of Hardware Buyers
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Talaro connects verified local hardware suppliers directly with contractors, builders, and tradespeople via WhatsApp.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 font-bold rounded-lg flex items-center justify-center mb-4">
            1
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Submit Verification
          </h3>
          <p className="text-sm text-gray-500">
            Submit your business name, contact info, storefront photo, and bill book proof for admin verification.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 font-bold rounded-lg flex items-center justify-center mb-4">
            2
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Receive Invite Code
          </h3>
          <p className="text-sm text-gray-500">
            Once approved by our team, you receive a single-use registration invite code via SMS or email.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 font-bold rounded-lg flex items-center justify-center mb-4">
            3
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-2">
            Start Selling Direct
          </h3>
          <p className="text-sm text-gray-500">
            List your inventory in INR. Buyers find your shop and message you directly on WhatsApp for orders.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">
          Ready to join the pilot?
        </h2>
        <p className="text-sm text-gray-600 mb-6 max-w-xl mx-auto">
          You can submit a seller request via our public API endpoint at{" "}
          <code className="text-xs bg-gray-200 px-2 py-1 rounded">
            POST {apiUrl}/public/seller-requests
          </code>{" "}
          or reach out to our onboarding team directly.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="mailto:onboarding@talaro.com?subject=Seller%20Onboarding%20Request"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-sm"
          >
            Email Onboarding Team
          </a>
          <Link
            href="/sellers"
            className="px-6 py-3 border border-gray-300 hover:bg-gray-100 text-gray-700 font-medium text-sm rounded-xl transition-colors"
          >
            Browse Existing Sellers
          </Link>
        </div>
      </div>
    </div>
  );
}
