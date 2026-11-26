"use client";

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

interface SellerFilterBarProps {
  initialCity?: string;
  initialPincode?: string;
}

export function SellerFilterBar({
  initialCity = "",
  initialPincode = "",
}: SellerFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [city, setCity] = useState(initialCity || searchParams.get("city") || "");
  const [pincode, setPincode] = useState(
    initialPincode || searchParams.get("pincode") || ""
  );

  const handleApply = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const params = new URLSearchParams();
    if (city.trim()) {
      params.set("city", city.trim());
    }
    if (pincode.trim()) {
      params.set("pincode", pincode.trim());
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const handleClear = () => {
    setCity("");
    setPincode("");
    router.push(pathname);
  };

  return (
    <form
      onSubmit={handleApply}
      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-8 flex flex-col md:flex-row items-stretch md:items-center gap-3"
    >
      <div className="flex-1">
        <label htmlFor="city-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          City
        </label>
        <input
          id="city-input"
          type="text"
          placeholder="e.g. Sirsa, Delhi, Mumbai"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex-1">
        <label htmlFor="pincode-input" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Pincode
        </label>
        <input
          id="pincode-input"
          type="text"
          placeholder="e.g. 125055"
          value={pincode}
          onChange={(e) => setPincode(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="flex items-center gap-2 pt-2 md:pt-5">
        <button
          type="submit"
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          Filter
        </button>
        {(city || pincode || searchParams.get("city") || searchParams.get("pincode")) && (
          <button
            type="button"
            onClick={handleClear}
            className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm font-medium rounded-lg transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
