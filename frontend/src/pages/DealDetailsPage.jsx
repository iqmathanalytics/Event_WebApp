import { Link, useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiCalendar, FiExternalLink, FiMapPin, FiTag } from "react-icons/fi";
import useAuth from "../hooks/useAuth";
import { fetchDealById, trackDealView } from "../services/listingService";
import { formatCurrency, formatDateUS } from "../utils/format";

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-6"
    >
      <img
        src={deal.image_url || "https://images.unsplash.com/photo-1556740749-887f6717d7e4?w=1400"}
        alt={deal.title}
        className={`aspect-[16/7] w-full rounded-3xl object-cover ${lockedPremium ? "blur-sm" : ""}`}
      />

      <div className="grid grid-cols-1 gap-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="mb-2 text-sm text-slate-500">{deal.city_name || "City"}</p>
          <h1 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">{deal.title}</h1>

          {Array.isArray(deal.tags) && deal.tags.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {deal.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <p className="inline-flex items-center gap-2">
              <FiMapPin className="text-slate-500" />
              {deal.provider_name || "Provider"}
            </p>
            <p className="inline-flex items-center gap-2">
              <FiTag className="text-slate-500" />
              {deal.category_name || "Category"}
            </p>
            <p className="inline-flex items-center gap-2">
              <FiCalendar className="text-slate-500" />
              Valid until {deal.expiry_date ? formatDateUS(deal.expiry_date) : "Not specified"}
            </p>
            <p className="inline-flex items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {dealDiscount}% OFF
              </span>
              {isPremium ? (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">Premium</span>
              ) : null}
            </p>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h2 className="text-base font-semibold text-slate-900">About this deal</h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {lockedPremium
                ? "Login to unlock full premium deal details, link access, and complete offer terms."
                : deal.description || "No deal description provided yet."}
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Price Details</p>
            <p className="mt-1 text-sm text-slate-600">
              <span className="line-through">{formatCurrency(Number(deal.original_price || deal.discounted_price || 0))}</span>{" "}
              <span className="font-semibold text-slate-900">
                {formatCurrency(Number(deal.discounted_price || deal.original_price || 0))}
              </span>
            </p>
            {deal.promo_code ? (
              guestLocked ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-600">
                    Promo:
                    <span className="relative ml-2 inline-flex min-w-[120px] items-center justify-center overflow-hidden rounded bg-slate-200 px-2 py-0.5">
                      <span className="absolute inset-0 bg-slate-300/80 backdrop-blur-md" aria-hidden="true" />
                      <span className="select-none font-bold tracking-[0.2em] text-slate-700 blur-sm">
                        {deal.promo_code}
                      </span>
                    </span>
                  </span>
                  <Link
                    to="/login"
                    className="inline-flex items-center rounded-full bg-rose-500 px-3 py-1 text-xs font-semibold text-white transition hover:bg-rose-600"
                  >
                    Unlock your savings
                  </Link>
                </div>
              ) : (
                <p className="mt-2 inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
                  Promo: {deal.promo_code}
                </p>
              )
            ) : null}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">Claim Deal</p>
                <p className="text-sm text-slate-600">
                  {guestLocked
                    ? "Sign in to reveal the deal link and redeem this offer instantly."
                    : "Continue to the offer page to redeem this deal."}
                </p>
              </div>
              {guestLocked ? (
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  Login to Reveal Deal
                </Link>
              ) : deal.deal_link ? (
                <a
                  href={deal.deal_link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <FiExternalLink />
                  Open Deal Link
                </a>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-full bg-slate-300 px-4 py-2 text-sm font-semibold text-slate-600"
                >
                  Link Not Available
                </button>
              )}
            </div>
          </div>

          <Link to="/deals" className="mt-5 inline-block text-sm font-semibold text-brand-600">
            Browse More Deals
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

export default DealDetailsPage;
