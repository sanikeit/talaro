"use client";

import { useState } from "react";

interface FormErrors {
  [key: string]: string;
}

export function SellerRequestForm() {
  const [formData, setFormData] = useState({
    business_name: "",
    contact_name: "",
    phone: "",
    city: "",
    pincode: "",
    shop_front_photo_url: "",
    bill_book_photo_url: "",
    gstin: "",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:9000";

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field-specific error on change
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setFieldErrors({});

    // Client-side quick validation
    const errors: FormErrors = {};
    if (!formData.business_name.trim()) {
      errors.business_name = "Business name is required";
    }
    if (!formData.contact_name.trim()) {
      errors.contact_name = "Contact name is required";
    }
    const cleanPhone = formData.phone.replace(/[\s\-\(\)]/g, "");
    if (!cleanPhone || !/^(?:\+91|91|0)?[0-9]{10}$/.test(cleanPhone)) {
      errors.phone = "Must be a valid 10-digit Indian phone number";
    }
    if (!formData.city.trim()) {
      errors.city = "City is required";
    }
    if (!formData.pincode.trim() || !/^[0-9]{6}$/.test(formData.pincode.trim())) {
      errors.pincode = "Must be a valid 6-digit PIN code";
    }
    if (!formData.shop_front_photo_url.trim()) {
      errors.shop_front_photo_url = "Shop front photo link is required";
    } else {
      try {
        const u = new URL(formData.shop_front_photo_url.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          errors.shop_front_photo_url = "Must start with http:// or https://";
        }
      } catch {
        errors.shop_front_photo_url = "Please enter a valid URL";
      }
    }
    if (!formData.bill_book_photo_url.trim()) {
      errors.bill_book_photo_url = "Bill book photo link is required";
    } else {
      try {
        const u = new URL(formData.bill_book_photo_url.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") {
          errors.bill_book_photo_url = "Must start with http:// or https://";
        }
      } catch {
        errors.bill_book_photo_url = "Please enter a valid URL";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      const payload: Record<string, any> = {
        business_name: formData.business_name.trim(),
        contact_name: formData.contact_name.trim(),
        phone: formData.phone.trim(),
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        shop_front_photo_url: formData.shop_front_photo_url.trim(),
        bill_book_photo_url: formData.bill_book_photo_url.trim(),
      };

      if (formData.gstin.trim()) {
        payload.gstin = formData.gstin.trim();
      }
      if (formData.notes.trim()) {
        payload.notes = formData.notes.trim();
      }

      const res = await fetch(`${apiUrl}/public/seller-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 201) {
        setSuccess(true);
      } else if (res.status === 400) {
        // Handle field-specific or general error message from API
        const msg = data.message || "Invalid request details. Please check the fields.";
        if (msg.includes("phone")) {
          setFieldErrors((prev) => ({ ...prev, phone: msg }));
        } else if (msg.includes("shop_front_photo_url")) {
          setFieldErrors((prev) => ({ ...prev, shop_front_photo_url: msg }));
        } else if (msg.includes("bill_book_photo_url")) {
          setFieldErrors((prev) => ({ ...prev, bill_book_photo_url: msg }));
        } else if (msg.includes("business_name")) {
          setFieldErrors((prev) => ({ ...prev, business_name: msg }));
        } else if (msg.includes("contact_name")) {
          setFieldErrors((prev) => ({ ...prev, contact_name: msg }));
        } else if (msg.includes("city")) {
          setFieldErrors((prev) => ({ ...prev, city: msg }));
        } else if (msg.includes("pincode")) {
          setFieldErrors((prev) => ({ ...prev, pincode: msg }));
        } else {
          setGeneralError(msg);
        }
      } else if (res.status === 429) {
        setGeneralError(
          data.message ||
            "Rate limit exceeded. Maximum 3 requests per phone number per hour. Please try again later."
        );
      } else {
        setGeneralError(
          data.message || "Failed to submit request. Please try again."
        );
      }
    } catch (err: any) {
      setGeneralError(
        err.message || "Network error. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 sm:p-10 text-center shadow-sm">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold text-gray-900 mb-2">
          Application Submitted!
        </h3>
        <p className="text-base text-gray-700 max-w-lg mx-auto mb-6">
          Thanks! We&apos;ll review your request and contact you on WhatsApp within 48 hours.
        </p>
        <button
          type="button"
          onClick={() => {
            setFormData({
              business_name: "",
              contact_name: "",
              phone: "",
              city: "",
              pincode: "",
              shop_front_photo_url: "",
              bill_book_photo_url: "",
              gstin: "",
              notes: "",
            });
            setSuccess(false);
          }}
          className="px-6 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          Submit another request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          Apply to Become a Verified Seller
        </h2>
        <p className="text-sm text-gray-600">
          Fill in your business details. Our verification team will review your application and reach out on WhatsApp.
        </p>
      </div>

      {generalError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{generalError}</span>
        </div>
      )}

      <div className="space-y-5">
        {/* Business Name & Contact Name */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="business_name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Business / Shop Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="business_name"
              name="business_name"
              value={formData.business_name}
              onChange={handleChange}
              placeholder="e.g. Apex Enterprises"
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.business_name ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.business_name && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.business_name}</p>
            )}
          </div>

          <div>
            <label htmlFor="contact_name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Contact Person Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="contact_name"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              placeholder="e.g. Ramesh Kumar"
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.contact_name ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.contact_name && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.contact_name}</p>
            )}
          </div>
        </div>

        {/* Phone, City, Pincode */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              WhatsApp Phone <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. 9876543210"
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.phone ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.phone && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.phone}</p>
            )}
          </div>

          <div>
            <label htmlFor="city" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="e.g. Sirsa"
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.city ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.city && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.city}</p>
            )}
          </div>

          <div>
            <label htmlFor="pincode" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Pincode <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="pincode"
              name="pincode"
              value={formData.pincode}
              onChange={handleChange}
              placeholder="e.g. 125055"
              maxLength={6}
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.pincode ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.pincode && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.pincode}</p>
            )}
          </div>
        </div>

        {/* Verification Photos Links */}
        <div className="border-t border-gray-100 pt-4 space-y-4">
          <div>
            <label htmlFor="shop_front_photo_url" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Shop Front Photo Link <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-1.5">
              Paste a link to a photo of your shop front (Google Drive, Dropbox, or any public URL).
            </p>
            <input
              type="url"
              id="shop_front_photo_url"
              name="shop_front_photo_url"
              value={formData.shop_front_photo_url}
              onChange={handleChange}
              placeholder="https://drive.google.com/..."
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.shop_front_photo_url ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.shop_front_photo_url && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.shop_front_photo_url}</p>
            )}
          </div>

          <div>
            <label htmlFor="bill_book_photo_url" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Bill Book / Invoice Proof Link <span className="text-red-500">*</span>
            </label>
            <p className="text-xs text-gray-500 mb-1.5">
              Paste a link to a photo of your bill book (Google Drive, Dropbox, or any public URL).
            </p>
            <input
              type="url"
              id="bill_book_photo_url"
              name="bill_book_photo_url"
              value={formData.bill_book_photo_url}
              onChange={handleChange}
              placeholder="https://drive.google.com/..."
              className={`w-full px-3.5 py-2.5 text-sm bg-gray-50 border ${
                fieldErrors.bill_book_photo_url ? "border-red-400 bg-red-50/50" : "border-gray-300"
              } rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all`}
            />
            {fieldErrors.bill_book_photo_url && (
              <p className="mt-1 text-xs text-red-600">{fieldErrors.bill_book_photo_url}</p>
            )}
          </div>
        </div>

        {/* GSTIN & Notes */}
        <div className="border-t border-gray-100 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="gstin" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              GSTIN (optional)
            </label>
            <input
              type="text"
              id="gstin"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              placeholder="e.g. 06AAAAA0000A1Z5"
              className="w-full px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label htmlFor="notes" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Additional Notes (optional)
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              value={formData.notes}
              onChange={handleChange}
              placeholder="Products you sell, key brands, etc."
              className="w-full px-3.5 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-blue-400 text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Submitting request...</span>
              </>
            ) : (
              <span>Submit Seller Application</span>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}