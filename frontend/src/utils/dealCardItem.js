/** Normalize API deal rows into DealCard props. */
export function toDealCardItem(item) {
  const original = Number(item?.original_price || 0);
  const discounted = Number(item?.discounted_price || 0);
  const discount =
    original > 0 && discounted >= 0 && discounted <= original
      ? Math.max(0, Math.round(((original - discounted) / original) * 100))
      : 0;

  return {
    id: item.id,
    title: item.title,
    public_slug: item.public_slug || item.publicSlug || "",
    city: item.city_name || item.city || "City",
    category: item.category_name || item.category || "Offer",
    provider: item.provider_name || item.provider || "",
    tags: item.tags || [],
    discount,
    originalPrice: original || discounted || 0,
    price: discounted || original || 0,
    image: item.image_url || item.image || "",
    dealInfo: item.terms_text || item.description || "",
    offerType: item.offer_type || item.offerType || "",
    offerMetaJson: item.offer_meta_json || item.offerMetaJson || null,
    expiryDate: item.expiry_date || item.expiryDate || "",
  };
}
