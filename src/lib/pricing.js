const BUYER_MARKUP_PERCENT = Number(import.meta.env.VITE_BUYER_MARKUP_PERCENT || 10);
const ADMIN_COMMISSION_PERCENT = Number(import.meta.env.VITE_ADMIN_COMMISSION_PERCENT || 10);

export const getBasePrice = (artworkOrPrice) => {
  if (typeof artworkOrPrice === 'number') {
    return artworkOrPrice;
  }

  if (!artworkOrPrice) {
    return 0;
  }

  return Number(artworkOrPrice.base_price ?? artworkOrPrice.price ?? 0);
};

export const getBuyerPrice = (artworkOrPrice) => {
  const basePrice = getBasePrice(artworkOrPrice);
  return Math.round(basePrice * (1 + BUYER_MARKUP_PERCENT / 100));
};

export const getSplitAmounts = (artworkOrPrice, quantity = 1) => {
  const baseAmount = Math.round(getBasePrice(artworkOrPrice) * quantity);
  const markupAmount = Math.round((baseAmount * BUYER_MARKUP_PERCENT) / 100);
  const commissionAmount = Math.round((baseAmount * ADMIN_COMMISSION_PERCENT) / 100);
  const buyerAmount = baseAmount + markupAmount;
  const artistAmount = Math.max(0, baseAmount - commissionAmount);
  const adminAmount = Math.max(0, buyerAmount - artistAmount);

  return {
    baseAmount,
    markupAmount,
    commissionAmount,
    buyerAmount,
    artistAmount,
    adminAmount,
  };
};

export const getFormattedRupee = (amount) => `₹${Number(amount || 0).toLocaleString('en-IN')}`;

export const BUYER_MARKUP_LABEL = `${BUYER_MARKUP_PERCENT}% markup`;