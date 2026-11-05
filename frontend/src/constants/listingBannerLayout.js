/**
 * Shared hero frame for event & deal detail pages.
 * Mobile/tablet: 2:1 to match promo banners.
 * Desktop (lg+): restored tall viewport banner.
 */
export const LISTING_DETAIL_BANNER_HEIGHT =
  "aspect-[2/1] w-full lg:aspect-auto lg:h-[75vh] lg:max-h-[920px] lg:min-h-[280px]";

export const LISTING_DETAIL_BANNER_SHELL =
  `relative w-full overflow-hidden rounded-2xl bg-slate-950 shadow-xl ring-1 ring-slate-900/10 lg:rounded-3xl ${LISTING_DETAIL_BANNER_HEIGHT}`;
