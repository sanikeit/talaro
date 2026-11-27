"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

interface HoldPassData {
  id: string;
  token: string;
  status: "requested" | "confirmed" | "rejected" | "expired" | "cancelled" | "picked_up";
  requested_at: string;
  responded_at?: string | null;
  expires_at?: string | null;
  rejection_reason?: string | null;
  buyer_name: string;
  buyer_phone: string;
  can_cancel: boolean;
  product: {
    title: string;
    thumbnail: string | null;
    price: number | null;
    currency: string;
  };
  seller: {
    name: string;
    handle: string | null;
    phone: string | null;
    address_line: string | null;
    city: string | null;
    pincode: string | null;
  };
}

export const HoldPassContent: React.FC<{ token: string }> = ({ token }) => {
  const [data, setData] = useState<HoldPassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<string>("");

  const fetchPass = async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
      const res = await fetch(`${apiUrl}/public/holds/${token}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        throw new Error("Hold pass not found or invalid link.");
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || "Failed to load hold pass.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPass();
  }, [token]);

  // Expiration countdown ticker
  useEffect(() => {
    if (!data?.expires_at || data.status !== "confirmed") return;

    const updateTimer = () => {
      const diff = new Date(data.expires_at!).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [data]);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this courtesy hold?")) return;
    setCancelling(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";
      const res = await fetch(`${apiUrl}/public/holds/${token}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by buyer" }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.message || "Failed to cancel hold");
      }
      await fetchPass();
    } catch (err: any) {
      alert(err.message || "Failed to cancel hold");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mb-3" />
        <p className="text-gray-500 text-sm">Loading courtesy pass...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center">
        <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-3">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">Pass Unavailable</h1>
        <p className="text-sm text-gray-500 mb-6">{error || "Could not find this hold pass."}</p>
        <Link
          href="/sellers"
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          Explore Local Sellers
        </Link>
      </div>
    );
  }

  // Status-specific banner configuration
  const statusConfig = {
    requested: {
      badgeBg: "bg-amber-100 text-amber-800 border-amber-200",
      badgeText: "Awaiting Confirmation",
      heading: "Request Sent to Merchant",
      desc: "The shopkeeper has been notified on WhatsApp. They have 4 hours to confirm your reservation.",
    },
    confirmed: {
      badgeBg: "bg-emerald-100 text-emerald-800 border-emerald-200",
      badgeText: "Active Hold (24h)",
      heading: "Item Reserved for 24 Hours",
      desc: "Show this pass when you visit the shop. Pay directly to the merchant upon pickup.",
    },
    picked_up: {
      badgeBg: "bg-blue-100 text-blue-800 border-blue-200",
      badgeText: "Picked Up",
      heading: "Purchase Completed in Store",
      desc: "This courtesy hold was completed. Thank you for supporting local shops!",
    },
    rejected: {
      badgeBg: "bg-red-100 text-red-800 border-red-200",
      badgeText: "Declined",
      heading: "Hold Request Declined",
      desc: data.rejection_reason || "The merchant is unable to reserve this item at this time.",
    },
    expired: {
      badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
      badgeText: "Expired",
      heading: "Hold Window Expired",
      desc: "The courtesy reservation window has ended. Check with the shopkeeper for stock availability.",
    },
    cancelled: {
      badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
      badgeText: "Cancelled",
      heading: "Hold Cancelled",
      desc: "This reservation request was cancelled by you.",
    },
  }[data.status] || {
    badgeBg: "bg-gray-100 text-gray-700 border-gray-200",
    badgeText: data.status.toUpperCase(),
    heading: `Hold Status: ${data.status}`,
    desc: "",
  };

  const sellerPhoneDigits = (data.seller.phone || "").replace(/\D/g, "");

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      {/* Digital Pass Card */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-xl overflow-hidden">
        {/* Pass Top Ribbon */}
        <div className="bg-gray-900 text-white p-5 px-6 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold tracking-wider text-blue-400 uppercase">
              Talaro Courtesy Pass
            </span>
            <p className="text-lg font-bold">24-Hour Request Hold</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${statusConfig.badgeBg}`}>
            {statusConfig.badgeText}
          </span>
        </div>

        {/* Status Notification Box */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-bold text-gray-900 mb-1">{statusConfig.heading}</h2>
          <p className="text-xs text-gray-600 leading-relaxed">{statusConfig.desc}</p>

          {data.status === "confirmed" && timeLeft && (
            <div className="mt-3.5 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Expires in: {timeLeft}</span>
            </div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="p-6 border-b border-gray-100">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Reserved Item
          </p>
          <div className="flex items-center gap-4">
            {data.product.thumbnail ? (
              <img
                src={data.product.thumbnail}
                alt={data.product.title}
                className="w-16 h-16 object-cover rounded-xl border border-gray-200 flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center text-gray-400 flex-shrink-0">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 text-base leading-snug">{data.product.title}</h3>
              <p className="text-lg font-extrabold text-gray-900 mt-1">
                {data.product.price ? `₹${data.product.price}` : "Price in store"}
              </p>
            </div>
          </div>
        </div>

        {/* Store & Directions Section */}
        <div className="p-6 border-b border-gray-100 bg-gray-50/30">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Merchant Location
          </p>
          <div className="flex flex-col gap-1">
            <h4 className="font-bold text-gray-900 text-sm">{data.seller.name}</h4>
            {data.seller.address_line && (
              <p className="text-xs text-gray-600">{data.seller.address_line}</p>
            )}
            <p className="text-xs text-gray-500">
              {[data.seller.city, data.seller.pincode].filter(Boolean).join(" - ")}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {data.seller.phone && (
              <a
                href={`tel:${data.seller.phone}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-semibold rounded-xl shadow-2xs transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <span>Call Shop</span>
              </a>
            )}

            {sellerPhoneDigits && (
              <a
                href={`https://wa.me/${sellerPhoneDigits}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>WhatsApp</span>
              </a>
            )}
          </div>
        </div>

        {/* Buyer Info */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between text-xs text-gray-500">
          <div>
            <span className="block text-gray-400">Reserved for:</span>
            <span className="font-semibold text-gray-800">{data.buyer_name}</span>
          </div>
          <div className="text-right">
            <span className="block text-gray-400">Buyer Phone:</span>
            <span className="font-semibold text-gray-800">{data.buyer_phone}</span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-gray-50/50 flex flex-col gap-2.5">
          {data.can_cancel && (
            <button
              onClick={handleCancel}
              disabled={cancelling}
              className="w-full py-2.5 text-center text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors disabled:opacity-50"
            >
              {cancelling ? "Cancelling hold..." : "Cancel Hold Request"}
            </button>
          )}

          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="flex-1 py-2.5 text-center text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors"
            >
              Search Products
            </Link>
            <Link
              href="/sellers"
              className="flex-1 py-2.5 text-center text-xs font-semibold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-xl transition-colors"
            >
              All Sellers
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
