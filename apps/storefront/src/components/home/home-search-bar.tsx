"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HomeSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (city.trim()) params.set("city", city.trim());

    // Navigate to /search if query provided, or /sellers if searching primarily by city
    const queryString = params.toString();
    if (query.trim()) {
      router.push(queryString ? `/search?${queryString}` : "/search");
    } else {
      router.push(queryString ? `/sellers?${queryString}` : "/sellers");
    }
  };

  return (
    <form
      onSubmit={handleSearch}
      className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl p-2 shadow-lg flex flex-col sm:flex-row items-center gap-2"
    >
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
          placeholder="Product or item title (e.g. runner, sandal)..."
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
          placeholder="City (e.g. Sirsa)..."
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
