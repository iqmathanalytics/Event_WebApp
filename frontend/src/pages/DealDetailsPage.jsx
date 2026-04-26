import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiExternalLink, FiImage, FiMapPin, FiTag } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { fetchDealById, trackDealView } from "../services/listingService";
import { formatCurrency, formatDateUS } from "../utils/format";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function DealDetailsPage() {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDeal() {
      try {
        setLoading(true);
        setError("");
        const response = await fetchDealById(id);
        if (active) {
          setDeal(response?.data || null);
          void trackDealView?.(id);
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
  }, [id]);

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

  useRouteContentReady(loading);

  if (loading) {
    return <p className="text-sm text-slate-500">Loading deal details...</p>;
  }

  if (!deal || error) {
    return (
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <p className="text-sm text-rose-600">{error || "Deal not found."}</p>
        <Link to="/deals" className="inline-block text-sm font-semibold text-brand-600">
          Browse Deals
        </Link>
      </div>
    );
  }

  const metaCard =
    "rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50/95 to-white p-3 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.7)] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4 lg:space-y-6"
    >
      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-900/10 lg:h-[75vh] lg:max-h-[920px] lg:min-h-[280px] lg:rounded-3xl lg:ring-0">
        {deal.image_url ? (
          <img
            src={deal.image_url}
            alt={deal.title}
            className={`aspect-[16/9] w-full object-cover object-center sm:aspect-[16/8] lg:aspect-auto lg:h-full ${lockedPremium ? "blur-sm" : ""}`}
          />
        ) : (
          <div className="relative flex aspect-[16/9] h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 sm:aspect-[16/8] lg:aspect-auto">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_20%,rgba(244,63,94,0.2),transparent_40%),radial-gradient(circle_at_75%_80%,rgba(16,185,129,0.18),transparent_42%)]" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-white/85">
              <div className="grid h-14 w-14 place-content-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur-sm">
                <FiImage className="h-7 w-7" />
              </div>
              <p className="text-sm font-semibold">No deal banner image</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:gap-5">
        <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-soft ring-1 ring-slate-900/[0.04] sm:p-5 lg:rounded-3xl lg:border-slate-200 lg:p-6 lg:shadow-sm lg:ring-0">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500 lg:mb-2 lg:text-sm lg:font-normal lg:tracking-normal">
            {deal.city_name || "City"}
          </p>
          <h1 className="text-[1.35rem] font-bold leading-[1.2] tracking-tight text-slate-900 sm:text-2xl lg:text-3xl">
            {deal.title}
          </h1>

          {Array.isArray(deal.tags) && deal.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5 lg:gap-2">
              {deal.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200/90 bg-slate-50 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700 lg:px-3 lg:py-1 lg:text-[11px]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 text-[13px] leading-snug text-slate-700 lg:grid-cols-2 lg:gap-3 lg:text-sm lg:text-slate-600">
            <div className={metaCard}>
              <p className="flex items-start gap-2">
                <FiMapPin className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span className="line-clamp-3 lg:line-clamp-none">{deal.provider_name || "Provider"}</span>
              </p>
            </div>
            <div className={metaCard}>
              <p className="flex items-start gap-2">
                <FiTag className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span>{deal.category_name || "Category"}</span>
              </p>
            </div>
            <div className={`col-span-2 ${metaCard} lg:col-span-1`}>
              <p className="flex items-start gap-2">
                <FiCalendar className="mt-0.5 shrink-0 text-brand-600 lg:text-slate-500" />
                <span>Valid until {deal.expiry_date ? formatDateUS(deal.expiry_date) : "Not specified"}</span>
              </p>
            </div>
            <div className={`col-span-2 flex flex-wrap items-center gap-2 ${metaCard} lg:col-span-1 lg:flex-nowrap`}>
              {dealDiscount > 0 ? (
                <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-emerald-200/80">
                  {dealDiscount}% OFF
                </span>
              ) : (
                <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 ring-1 ring-slate-200/80">
                  Special offer
                </span>
              )}
              {isPremium ? (
                <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-amber-200/80">
                  Premium
                </span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5 lg:mt-5">
            <h2 className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-base lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
              About this deal
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-slate-700 lg:text-sm lg:leading-6">
              {lockedPremium
                ? "Login to unlock full premium deal details, link access, and complete offer terms."
                : deal.description || "No deal description provided yet."}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/90 bg-gradient-to-br from-slate-50 to-white p-4 lg:rounded-2xl lg:border-slate-200 lg:bg-slate-50 lg:from-slate-50 lg:to-slate-50">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 lg:text-sm lg:font-semibold lg:normal-case lg:tracking-normal lg:text-slate-900">
              Price details
            </p>
            {hasPricing ? (
              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-bold text-slate-900 lg:text-xl">
                  {formatCurrency(Number(deal.discounted_price || deal.original_price || 0))}
                </span>
                {Number(deal.original_price || 0) > 0 && Number(deal.discounted_price || 0) > 0 ? (
                  <span className="text-sm text-slate-500 line-through">
                    {formatCurrency(Number(deal.original_price))}
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-slate-600">Pricing is shared by the provider at redemption.</p>
            )}
            {deal.promo_code ? (
              guestLocked ? (
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                    Promo:
                    <span className="relative inline-flex min-w-[120px] items-center justify-center overflow-hidden rounded bg-slate-200 px-2 py-0.5">
                      <span className="absolute inset-0 bg-slate-300/80 backdrop-blur-md" aria-hidden="true" />
                      <span className="select-none font-bold tracking-[0.2em] text-slate-700 blur-sm">
                        {deal.promo_code}
                      </span>
                    </span>
                  </span>
                  <Link
                    to="/login"
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-xl bg-rose-500 px-4 text-sm font-semibold text-white transition hover:bg-rose-600 sm:flex-none sm:rounded-full sm:py-1.5 lg:px-3 lg:text-xs"
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
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50 to-white p-4 lg:rounded-2xl lg:border-slate-200 lg:bg-slate-50 lg:from-slate-50 lg:to-slate-50">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">Claim deal</p>
                <p className="mt-0.5 text-[13px] leading-snug text-slate-600 lg:text-sm">
                  {guestLocked
                    ? "Sign in to reveal the deal link and redeem this offer instantly."
                    : "Continue to the offer page to redeem this deal."}
                </p>
              </div>
              {guestLocked ? (
                <Link
                  to="/login"
                  className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 lg:min-h-0 lg:w-auto lg:rounded-full lg:py-2"
                >
                  Login to reveal deal
                </Link>
              ) : deal.deal_link ? (
                <a
                  href={deal.deal_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800 lg:min-h-0 lg:w-auto lg:rounded-full lg:py-2"
                >
                  <FiExternalLink className="shrink-0" />
                  Open deal link
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex min-h-[48px] w-full cursor-not-allowed items-center justify-center rounded-xl bg-slate-300 px-4 text-sm font-semibold text-slate-600 lg:min-h-0 lg:w-auto lg:rounded-full lg:py-2"
                >
                  Link not available
                </button>
              )}
            </div>
          </div>

          <Link
            to="/deals"
            className="mt-5 flex w-full items-center justify-center rounded-xl border border-dashed border-brand-300/70 bg-brand-50/50 py-3 text-sm font-semibold text-brand-700 transition hover:bg-brand-50 lg:mt-5 lg:inline-flex lg:w-auto lg:border-0 lg:bg-transparent lg:py-0 lg:text-brand-600"
          >
            Browse more deals
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default DealDetailsPage;
