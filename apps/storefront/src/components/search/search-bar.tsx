"use client";

import { useState } from "react";

interface SearchBarProps {
  initialQuery?: string;
  initialCity?: string;
  initialPincode?: string;
}

export function SearchBar({
  initialQuery = "",
  initialCity = "",
  initialPincode = "",
}: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [city, setCity] = useState(initialCity);

  return (
    <form
      action="/search"
      method="get"
      className="w-full bg-white border border-gray-200 rounded-2xl p-2 shadow-sm flex flex-col sm:flex-row items-center gap-2 mb-6"
    >
      {initialPincode ? (
        <input type="hidden" name="pincode" value={initialPincode} />
      ) : null}

      <div className="flex-1 w-full flex items-center px-3 py-2 border-b sm:border-b-0 sm:border-r border-gray-100">
        <svg
          className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          name="q"
          placeholder="Search products, brands, or items"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      <div className="w-full sm:w-48 flex items-center px-3 py-2">
        <svg
          className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        <input
          type="text"
          name="city"
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
        />
      </div>

      <button
        type="submit"
        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
      >
        Search
      </button>
    </form>
  );
}
