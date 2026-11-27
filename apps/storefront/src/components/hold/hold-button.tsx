"use client";

import React, { useState } from "react";
import { HoldModal } from "./hold-modal";

interface HoldButtonProps {
  offerId: string;
  productTitle: string;
  productThumbnail?: string | null;
  price: number | string;
  sellerName: string;
  sellerCity?: string | null;
  isHeld?: boolean;
}

export const HoldButton: React.FC<HoldButtonProps> = ({
  offerId,
  productTitle,
  productThumbnail,
  price,
  sellerName,
  sellerCity,
  isHeld = false,
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  if (isHeld) {
    return (
      <button
        type="button"
        disabled
        title="This item is currently reserved on courtesy hold by another buyer."
        className="inline-flex items-center justify-center px-3 py-2 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg cursor-not-allowed opacity-90"
      >
        <span>Held (24h)</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="inline-flex items-center justify-center px-3 py-2 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 text-blue-700 border border-blue-200 text-xs font-semibold rounded-lg transition-colors shadow-2xs"
      >
        <span>24h hold</span>
      </button>

      <HoldModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        offerId={offerId}
        productTitle={productTitle}
        productThumbnail={productThumbnail}
        price={price}
        sellerName={sellerName}
        sellerCity={sellerCity}
      />
    </>
  );
};
