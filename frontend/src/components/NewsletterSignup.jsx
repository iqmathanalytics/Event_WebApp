import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiLoader, FiMail } from "react-icons/fi";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import useCityFilter from "../hooks/useCityFilter";
import { categories } from "../utils/filterOptions";
import { fetchMyNewsletterStatus, subscribeNewsletter, subscribeNewsletterGuest } from "../services/newsletterService";

function InterestChips({ selectedLabels, onToggle, disabled }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Interests">
      {categories.map((cat) => {
        const on = selectedLabels.includes(cat.label);
        return (
          <button
            key={cat.value}
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => onToggle(cat.label)}
            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-60 sm:text-sm ${
              on
                ? "border-brand-600 bg-brand-600 text-white shadow-sm shadow-brand-600/20"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {cat.label}
          </button>
        );
      })}
    </div>
  );
}

function NewsletterSignup({ title, description, cityId, className = "" }) {
  const { isAuthenticated, user, accessToken } = useAuth();
  const { cities, selectedCity } = useCityFilter();
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  /** True when the server reported this email was already on the list (guest) or already subscribed (logged-in). */
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [error, setError] = useState("");
  const [guest, setGuest] = useState({
    email: "",
    first_name: "",
    last_name: ""
  });
  const [guestCity, setGuestCity] = useState("");
  const [selectedInterests, setSelectedInterests] = useState([]);

  const interestsPayload = useMemo(
    () => selectedInterests.join(", ").slice(0, 500),
    [selectedInterests]
  );

  useEffect(() => {
    setGuestCity((prev) => prev || selectedCity || "");
  }, [selectedCity]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      // Match server state to the Bearer token only. Do not gate on `isAuthenticated` (accessToken && user):
      // if `user` is missing from storage briefly or JSON parse fails, we still need status so guest-then-account
      // subscribers see "already on the list" instead of an enabled Subscribe button.
      if (!accessToken) {
        setSubscribed(false);
        return;
      }
      try {
        setChecking(true);
        const status = await fetchMyNewsletterStatus();
        if (mounted) {
          const s = status?.subscribed;
          setSubscribed(s === true || s === 1 || s === "true");
          setAlreadyRegistered(false);
        }
      } catch (_err) {
        if (mounted) {
          setSubscribed(false);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [accessToken, user?.id, user?.email]);

  const toggleInterest = (label) => {
    setSelectedInterests((prev) => {
      if (prev.includes(label)) {
        return prev.filter((x) => x !== label);
      }
      const next = [...prev, label];
      const joined = next.join(", ");
      if (joined.length > 500) {
        return prev;
      }
      return next;
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setAlreadyRegistered(false);
    setSubmitting(true);
    try {
      if (isAuthenticated) {
        const res = await subscribeNewsletter({
          city_id: cityId
        });
        setAlreadyRegistered(Boolean(res?.data?.alreadySubscribed ?? res?.alreadySubscribed));
      } else {
        const res = await subscribeNewsletterGuest({
          email: guest.email,
          first_name: guest.first_name,
          last_name: guest.last_name,
          ...(guestCity ? { city_id: guestCity } : {}),
          ...(interestsPayload ? { interested_in: interestsPayload } : {})
        });
        setAlreadyRegistered(Boolean(res?.data?.alreadySubscribed ?? res?.alreadySubscribed));
      }
      setSubscribed(true);
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.details?.[0]?.message ||
        "Something went wrong. Please try again.";
      setError(typeof msg === "string" ? msg : "Subscription failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20";

  const labelClass = "text-xs font-semibold text-slate-700";

  return (
    <div className={`rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8 ${className}`}>
      <div className="space-y-2">
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
            <FiMail className="h-4 w-4" />
          </span>
          <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
            {subscribed
              ? alreadyRegistered
                ? "You’re already with us"
                : "You’re on the list!"
              : title || "Stay in the loop"}
          </h2>
        </div>
        {description ? <p className="text-sm text-slate-600">{description}</p> : null}
        {subscribed ? (
          <p className={`mt-2 text-sm leading-relaxed ${alreadyRegistered ? "text-slate-700" : "text-emerald-700"}`}>
            {alreadyRegistered
              ? isAuthenticated
                ? "You’re all set—curated city picks are already on their way to you. We’ll see you in the next send."
                : guest.first_name
                  ? `Lovely to see you again, ${guest.first_name}. You’re already subscribed—your next roundup of city favorites is headed to your inbox.`
                  : "Lovely to see you again—you’re already subscribed, and your next roundup of city favorites is headed to your inbox."
              : isAuthenticated
                ? "Thanks for subscribing—weekly city picks are headed your way."
                : guest.first_name
                  ? `Thanks, ${guest.first_name}—weekly city picks are headed your way.`
                  : "Thanks for subscribing—weekly city picks are headed your way."}
          </p>
        ) : null}
      </div>

      {!subscribed ? (
        <form onSubmit={onSubmit} className="mt-6 flex w-full flex-col gap-4">
          {isAuthenticated ? (
            <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-stretch">
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {user?.email || "Logged-in user"}
              </div>
              <motion.button
                type="submit"
                disabled={submitting || checking}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {submitting ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Subscribe"
                )}
              </motion.button>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block min-w-0">
                  <span className={labelClass}>First name</span>
                  <input
                    type="text"
                    name="first_name"
                    autoComplete="given-name"
                    required
                    value={guest.first_name}
                    onChange={(e) => setGuest((g) => ({ ...g, first_name: e.target.value }))}
                    className={`mt-1 ${inputClass}`}
                    placeholder="Alex"
                  />
                </label>
                <label className="block min-w-0">
                  <span className={labelClass}>Last name</span>
                  <input
                    type="text"
                    name="last_name"
                    autoComplete="family-name"
                    required
                    value={guest.last_name}
                    onChange={(e) => setGuest((g) => ({ ...g, last_name: e.target.value }))}
                    className={`mt-1 ${inputClass}`}
                    placeholder="Rivera"
                  />
                </label>
              </div>
              <label className="block">
                <span className={labelClass}>Email</span>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={guest.email}
                  onChange={(e) => setGuest((g) => ({ ...g, email: e.target.value }))}
                  className={`mt-1 ${inputClass}`}
                  placeholder="you@example.com"
                />
              </label>
              <label className="block">
                <span className={labelClass}>City</span>
                <select
                  name="city"
                  value={guestCity}
                  onChange={(e) => setGuestCity(e.target.value)}
                  className={`mt-1 ${inputClass} appearance-none bg-white`}
                >
                  <option value="">Anywhere / not sure yet</option>
                  {cities.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className={`${labelClass} block`}>
                  Interested in <span className="font-normal text-slate-500">(optional)</span>
                </span>
                <p className="mb-2 mt-1 text-xs text-slate-500">Tap one or more topics—we’ll tailor picks.</p>
                <InterestChips
                  selectedLabels={selectedInterests}
                  onToggle={toggleInterest}
                  disabled={submitting}
                />
              </div>
              <motion.button
                type="submit"
                disabled={submitting}
                whileHover={{ scale: submitting ? 1 : 1.02 }}
                whileTap={{ scale: submitting ? 1 : 0.98 }}
                className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:self-start"
              >
                {submitting ? (
                  <>
                    <FiLoader className="h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  "Subscribe"
                )}
              </motion.button>
            </>
          )}
        </form>
      ) : null}

      <AnimatePresence mode="wait">
        {!isAuthenticated && !subscribed ? (
          <motion.p
            key="auth-note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-sm text-slate-600"
          >
            Prefer an account?{" "}
            <Link to="/register" className="font-semibold text-brand-600">
              Register
            </Link>{" "}
            or{" "}
            <Link to="/login" className="font-semibold text-brand-600">
              sign in
            </Link>
            .
          </motion.p>
        ) : null}
        {error ? (
          <motion.p
            key="err"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-rose-600"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

export default NewsletterSignup;
