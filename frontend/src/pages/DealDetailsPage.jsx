import { Link, useParams } from "react-router-dom";
import { absoluteListingUrl, dealDetailPath } from "../utils/listingPaths";
import ShareListingButton from "../components/ShareListingButton";
import ListingFavoriteButton from "../components/ListingFavoriteButton";
import { useCanonicalListingUrl } from "../utils/useCanonicalListingUrl";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiExternalLink, FiImage, FiMapPin, FiTag } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { fetchDealById, trackDealView } from "../services/listingService";
import { formatCurrency, formatDateUS } from "../utils/format";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import ListingDetailBannerImage from "../components/ListingDetailBannerImage";
import { LandingTagList } from "../components/ListingTagIcon";
import { LISTING_DETAIL_BANNER_SHELL } from "../constants/listingBannerLayout";

function DealDetailsPage() {
  const { slug } = useParams();
  const { isAuthenticated } = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showClaimBar, setShowClaimBar] = useState(false);
  const claimRef = useRef(null);

  useCanonicalListingUrl(deal, dealDetailPath);

  useEffect(() => {
    let active = true;
    async function loadDeal() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchDealById(slug);
        if (active) {
          setDeal(response?.data || null);
          void trackDealView?.(slug);
        }
      } catch (_err) {
        if (active) {
          setDeal(null);
          setError("Could not load this deal.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    loadDeal();
    return () => {
      active = false;
    };
  }, [slug]);

  const isPremium = deal?.is_premium === 1 || deal?.is_premium === true;
  const lockedPremium = isPremium && !isAuthenticated;
  const guestLocked = !isAuthenticated;
  const dealDiscount = useMemo(() => {
    const original = Number(deal?.original_price || 0);
    const discounted = Number(deal?.discounted_price || 0);
    if (original > 0 && discounted >= 0 && discounted <= original) {
      return Math.max(0, Math.round(((original - discounted) / original) * 100));
    }
    return 0;
  }, [deal]);
  const hasPricing = Number(deal?.original_price || 0) > 0 || Number(deal?.discounted_price || 0) > 0;

  useEffect(() => {
    const node = claimRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      return undefined;
    }
    const media = window.matchMedia("(max-width: 1023px)");
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowClaimBar(media.matches && !entry.isIntersecting);
      },
      { threshold: 0.15 }
    );
    const watch = () => {
      observer.disconnect();
      if (!media.matches) {
        setShowClaimBar(false);
        return;
      }
      observer.observe(node);
    };
    watch();
    media.addEventListener("change", watch);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", watch);
    };
  }, [deal?.id, loading]);

  useRouteContentReady(loading);

  if (loading) {
    return (
      <>
        <p className="hidden text-sm text-slate-500 lg:block">Loading deal details...</p>
        <div className="space-y-3 lg:hidden" aria-busy="true" aria-label="Loading deal details">
          <div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
          <div className="h-6 w-2/3 animate-pulse rounded-full bg-slate-200" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
        </div>
      </>
    );
  }

  if (!deal || error) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-base font-medium text-rose-600 lg:text-sm">{error || "Deal not found."}</p>
        <Link to="/deals" className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-600 lg:inline-block lg:min-h-0">
          Browse Deals
        </Link>
      </div>
    );
  }

  const metaCard =
    "rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/95 to-white p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] lg:rounded-xl lg:border-slate-100 lg:bg-slate-50/80 lg:p-3 lg:shadow-none";
  const metaValue = "font-semibold text-slate-900";

  const claimCta = guestLocked ? (
    <Link
      to="/login"
      className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 lg:min-h-11"
    >
      Login to reveal deal
    </Link>
  ) : deal.deal_link ? (
    <a
      href={deal.deal_link}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 lg:min-h-11"
    >
      <FiExternalLink className="shrink-0" />
      Open deal link
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex min-h-12 w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-4 text-sm font-semibold text-slate-600 lg:min-h-11"
    >
      Link not available
    </button>
  );

  const pricePanel = (observeClaim) => (
    <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-4 shadow-soft ring-1 ring-slate-900/[0.03] lg:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-[11px]">Price details</p>
      {hasPricing ? (
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-2xl font-bold tracking-tight text-slate-900 lg:text-[1.75rem]">
            {formatCurrency(Number(deal.discounted_price || deal.original_price || 0))}
          </span>
          {Number(deal.original_price || 0) > 0 && Number(deal.discounted_price || 0) > 0 ? (
            <span className="text-sm text-slate-500 line-through">{formatCurrency(Number(deal.original_price))}</span>
          ) : null}
          {dealDiscount > 0 ? (
            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 ring-1 ring-emerald-200/80">
              {dealDiscount}% OFF
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-sm text-slate-600">Pricing is shared by the provider at redemption.</p>
      )}

      {deal.promo_code ? (
        guestLocked ? (
          <div className="mt-4 space-y-2">
            <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              Promo:
              <span className="relative inline-flex min-w-[120px] items-center justify-center overflow-hidden rounded bg-slate-200 px-2 py-0.5">
                <span className="absolute inset-0 bg-slate-300/80 backdrop-blur-md" aria-hidden="true" />
                <span className="select-none font-bold tracking-[0.2em] text-slate-700 blur-sm">{deal.promo_code}</span>
              </span>
            </span>
            <Link
              to="/login"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600"
            >
              Unlock your savings
            </Link>
          </div>
        ) : (
          <p className="mt-3 inline-flex rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
            Promo: {deal.promo_code}
          </p>
        )
      ) : null}

      <div
        ref={observeClaim ? claimRef : undefined}
        id={observeClaim ? "deal-claim" : undefined}
        className="mt-5 border-t border-slate-200/80 pt-4"
      >
        <p className="text-sm font-semibold text-slate-900">Claim deal</p>
        <p className="mt-0.5 text-[13px] leading-snug text-slate-600 lg:text-sm">
          {guestLocked
            ? "Sign in to reveal the deal link and redeem this offer instantly."
            : "Continue to the offer page to redeem this deal."}
        </p>
        <div className="mt-3">{claimCta}</div>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4 lg:space-y-6"
    >
      <div className={`${LISTING_DETAIL_BANNER_SHELL} ring-0 lg:ring-0`}>
        {deal.image_url ? (
          <ListingDetailBannerImage
            src={deal.image_url}
            alt={deal.title}
            guestLocked={lockedPremium}
            eager
          />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(244,63,94,0.2),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(16,185,129,0.18),transparent_42%)]" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-white/85">
              <div className="grid h-14 w-14 place-content-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                <FiImage className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold">No deal banner image</p>
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 z-10 rounded-2xl ring-1 ring-inset ring-white/10 lg:rounded-3xl" aria-hidden />
        {dealDiscount > 0 ? (
          <div className="absolute bottom-3 left-3 z-20 lg:bottom-5 lg:left-5">
            <span className="inline-flex rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-md">
              {dealDiscount}% off
            </span>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:items-start lg:gap-8">
        <div className="relative rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.04] sm:p-5 lg:rounded-3xl lg:border-slate-200 lg:p-6 lg:shadow-sm lg:ring-0">
          <div className="mb-3 flex min-w-0 flex-nowrap items-center gap-1.5 overflow-x-hidden lg:absolute lg:right-6 lg:top-6 lg:mb-0 lg:justify-end lg:gap-2">
            <ListingFavoriteButton listingType="deal" listingId={deal.id} embedded label="Like" className="event-action-btn" />
            <ShareListingButton
              url={absoluteListingUrl(dealDetailPath(deal))}
              title={deal.title}
              listingType="deal"
              className="event-action-btn inline-flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200/90 bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-900/[0.03] backdrop-blur-sm transition hover:border-slate-300 hover:bg-white hover:text-slate-900 hover:shadow-md lg:px-3 lg:min-h-0"
            />
          </div>

          <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-500 lg:mb-2 lg:pr-40 lg:text-sm lg:font-normal lg:tracking-normal">
            {deal.city_name || "City"}
          </p>
          <h1 className="text-[1.35rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-2xl lg:pr-40 lg:text-3xl">
            {deal.title}
          </h1>

          {Array.isArray(deal.tags) && deal.tags.length ? (
            <div className="mt-3">
              <LandingTagList
                tags={deal.tags}
                classFor={() =>
                  "rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700 lg:px-3 lg:py-1 lg:text-[11px]"
                }
              />
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] leading-snug lg:gap-3 lg:text-sm">
            <div className={metaCard}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiMapPin className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={`line-clamp-3 ${metaValue}`}>{deal.provider_name || "Provider"}</span>
              </p>
            </div>
            <div className={metaCard}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiTag className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={metaValue}>{deal.category_name || "Category"}</span>
              </p>
            </div>
            <div className={`col-span-2 ${metaCard}`}>
              <p className="flex items-start gap-2 text-slate-600">
                <FiCalendar className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className={metaValue}>
                  Valid until {deal.expiry_date ? formatDateUS(deal.expiry_date) : "Not specified"}
                </span>
              </p>
            </div>
            {isPremium ? (
              <div className={`col-span-2 ${metaCard}`}>
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-900 ring-1 ring-amber-200/80">
                  Premium deal
                </span>
              </div>
            ) : null}
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
              About this deal
            </h2>
            <p className="mt-2 text-[15px] font-medium leading-relaxed text-slate-800 lg:text-sm lg:leading-6">
              {lockedPremium
                ? "Login to unlock full premium deal details, link access, and complete offer terms."
                : deal.description || "No deal description provided yet."}
            </p>
            {!lockedPremium && deal.terms_text ? (
              <>
                <h3 className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-sm lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
                  Terms
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-slate-700 lg:text-sm">{deal.terms_text}</p>
              </>
            ) : null}
          </div>

          <div className="mt-5 lg:hidden">{pricePanel(true)}</div>

          <Link
            to="/deals"
            className="mt-5 flex w-full items-center justify-center rounded-xl border border-dashed border-brand-300/70 bg-brand-50/50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 lg:mt-6 lg:inline-flex lg:w-auto lg:border-0 lg:bg-transparent lg:py-0 lg:text-brand-600"
          >
            Browse more deals
          </Link>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">{pricePanel(false)}</div>
        </aside>
      </div>

      {showClaimBar && (guestLocked || deal.deal_link) ? (
        <div
          className="fixed inset-x-0 z-[46] px-3 lg:hidden"
          style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-lg items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 shadow-soft backdrop-blur">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {hasPricing ? "From" : "Deal"}
              </p>
              <p className="truncate text-sm font-semibold tabular-nums text-slate-900">
                {hasPricing
                  ? formatCurrency(Number(deal.discounted_price || deal.original_price || 0))
                  : "Claim offer"}
              </p>
            </div>
            {guestLocked ? (
              <Link
                to="/login"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white active:scale-[0.98]"
              >
                Sign in
              </Link>
            ) : (
              <a
                href={deal.deal_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white active:scale-[0.98]"
              >
                Open deal
              </a>
            )}
          </div>
        </div>
      ) : null}
    </motion.div>
  );
}

export default DealDetailsPage;
