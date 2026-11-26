import Link from "next/link";
import Image from "next/image";
import { buildWhatsAppLink } from "@/lib/whatsapp";

export interface SellerData {
  id: string;
  name: string;
  handle: string;
  description: string | null;
  logo: string | null;
  banner: string | null;
  city: string | null;
  pincode: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  delivery_available?: boolean;
  verification_tier?: string;
  created_at?: string;
}

interface SellerCardProps {
  seller: SellerData;
}

export function SellerCard({ seller }: SellerCardProps) {
  const phone = seller.whatsapp_phone || seller.phone;
  const whatsappUrl = phone ? buildWhatsAppLink(phone) : null;

  // Verification Badge styling
  const tier = (seller.verification_tier || "LISTED").toUpperCase();
  let badgeStyle = "bg-gray-100 text-gray-700 border-gray-300";
  let badgeLabel = "LISTED";

  if (tier === "VERIFIED") {
    badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-300";
    badgeLabel = "VERIFIED";
  } else if (tier === "INCOMPLETE" || tier === "STALE") {
    badgeStyle = "bg-amber-50 text-amber-700 border-amber-300";
    badgeLabel = tier;
  }

  // Initials Avatar
  const initials = seller.name
    ? seller.name
        .split(" ")
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "S";

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Header: Logo + Name + Badge */}
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
            {seller.logo ? (
              <Image
                src={seller.logo}
                alt={seller.name}
                width={56}
                height={56}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-gray-600 font-bold text-lg">{initials}</span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <Link
                href={`/s/${seller.handle}`}
                className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate transition-colors"
                title={seller.name}
              >
                {seller.name}
              </Link>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${badgeStyle}`}
              >
                {badgeLabel}
              </span>
            </div>

            {/* Location (City + Pincode) */}
            <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5 text-gray-400 flex-shrink-0"
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
              <span>
                {seller.city ? seller.city : "Location unlisted"}
                {seller.pincode ? ` - ${seller.pincode}` : ""}
              </span>
            </div>
          </div>
        </div>

        {/* Description snippet if available */}
        {seller.description && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-4">
            {seller.description}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="pt-3 border-t border-gray-100 flex flex-col gap-2 mt-2">
        <div className="grid grid-cols-2 gap-2">
          {/* WhatsApp Button */}
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              <span>WhatsApp</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="No contact info"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed"
            >
              <span>WhatsApp</span>
            </button>
          )}

          {/* Call Button */}
          {phone ? (
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              <span>Call</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="No contact info"
              className="inline-flex items-center justify-center gap-1 px-3 py-2 border border-gray-200 text-gray-300 text-xs font-medium rounded-lg cursor-not-allowed"
            >
              <span>Call</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          {/* View shop link */}
          <Link
            href={`/s/${seller.handle}`}
            className="inline-flex items-center justify-center px-3 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-medium rounded-lg transition-colors text-center"
          >
            View shop
          </Link>

          {/* Request 24h hold (TASK 5) */}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="inline-flex items-center justify-center px-3 py-2 bg-gray-100 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed"
          >
            24h hold
          </button>
        </div>
      </div>
    </div>
  );
}
