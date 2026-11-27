"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

interface HoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  productTitle: string;
  productThumbnail?: string | null;
  price: number | string;
  sellerName: string;
  sellerCity?: string | null;
}

export const HoldModal: React.FC<HoldModalProps> = ({
  isOpen,
  onClose,
  offerId,
  productTitle,
  productThumbnail,
  price,
  sellerName,
  sellerCity,
}) => {
  const router = useRouter();
  const [buyerName, setBuyerName] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
      const res = await fetch(`${apiUrl}/public/holds`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          offer_id: offerId,
          buyer_name: buyerName.trim(),
          buyer_phone: buyerPhone.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to request hold");
      }

      // Store hold token in local storage for navigation & retention
      try {
        const stored = localStorage.getItem("talaro_active_holds");
        const list = stored ? JSON.parse(stored) : [];
        list.push({
          token: data.token,
          title: productTitle,
          seller: sellerName,
          expires_at: data.expires_at,
        });
        localStorage.setItem("talaro_active_holds", JSON.stringify(list));
      } catch (_e) {}

      // Open WhatsApp deep link in a new window/tab to notify seller
      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, "_blank", "noopener,noreferrer");
      }

      // Redirect to digital pass page
      router.push(`/h/${data.token}`);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
          aria-label="Close modal"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span>
          <h2 className="text-lg font-bold text-gray-900">Request 24-Hour Hold</h2>
        </div>

        {/* Product Summary Box */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl mb-4">
          {productThumbnail ? (
            <img
              src={productThumbnail}
              alt={productTitle}
              className="w-14 h-14 object-cover rounded-lg border border-gray-200 flex-shrink-0"
            />
          ) : (
            <div className="w-14 h-14 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm truncate">{productTitle}</h3>
            <p className="text-xs text-gray-500 truncate">
              {sellerName} {sellerCity ? `• ${sellerCity}` : ""}
            </p>
            <p className="text-sm font-bold text-gray-900 mt-0.5">₹{price}</p>
          </div>
        </div>

        {/* Policy Explainer */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 mb-4 leading-relaxed">
          <p className="font-medium mb-1">🤝 How Courtesy Holds Work:</p>
          <p className="text-blue-800">
            The shopkeeper is notified on WhatsApp to hold this item for 24h. No online payment is collected — pay directly at the store upon pickup.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Your Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              placeholder="e.g. Rajesh Kumar"
              className="w-full px-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Mobile Number (WhatsApp) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2 text-sm text-gray-500 font-medium">
                +91
              </span>
              <input
                type="tel"
                required
                disabled={loading}
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                placeholder="98765 43210"
                maxLength={10}
                className="w-full pl-12 pr-3.5 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              10-digit number used by the seller to identify you in store.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Requesting...</span>
                </>
              ) : (
                <span>Request Hold</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
