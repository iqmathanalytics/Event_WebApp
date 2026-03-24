import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck, FiLoader, FiMail } from "react-icons/fi";
import { Link } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { fetchMyNewsletterStatus, subscribeNewsletter } from "../services/newsletterService";

function NewsletterSignup({
  variant = "page",
  title,
  description,
  cityId,
  className = ""
}) {
  const { isAuthenticated, user } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!isAuthenticated) {
        setSubscribed(false);
        return;
      }
      try {
        setChecking(true);
        const response = await fetchMyNewsletterStatus(cityId);
        if (mounted) {
          setSubscribed(Boolean(response?.data?.subscribed));
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
  }, [isAuthenticated, cityId]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await subscribeNewsletter({
        city_id: cityId
      });
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

  const isCompact = variant === "footer" || variant === "compact";
  if (isCompact && subscribed) {
    return null;
  }

  return (
    <div
      className={`${
        isCompact
          ? "rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-soft backdrop-blur-sm"
          : "rounded-3xl border border-slate-200 bg-white p-6 shadow-soft sm:p-8"
      } ${className}`}
    >
      <div className={isCompact ? "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between" : "space-y-2"}>
        <div className={isCompact ? "min-w-0 flex-1" : ""}>
          <div className="mb-1 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
              <FiMail className="h-4 w-4" />
            </span>
            <h2
              className={`font-semibold text-slate-900 ${
                isCompact ? "text-sm sm:text-base" : "text-lg sm:text-xl"
              }`}
            >
              {subscribed ? "Already subscribed!" : title || "Stay in the loop"}
            </h2>
          </div>
          {description ? (
            <p
              className={`text-slate-600 ${isCompact ? "text-xs sm:text-sm" : "text-sm"}`}
            >
              {description}
            </p>
          ) : null}
          {subscribed ? (
            <p className={`mt-2 text-emerald-700 ${isCompact ? "text-xs sm:text-sm" : "text-sm"}`}>
              You are already on the list. Fresh city drops are coming your way.
            </p>
          ) : null}
        </div>

        {!subscribed ? (
          <form
            onSubmit={onSubmit}
            className={`flex w-full flex-col gap-2 ${isCompact ? "sm:max-w-md sm:flex-row sm:items-stretch" : "sm:flex-row sm:items-stretch"}`}
          >
            {isAuthenticated ? (
              <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                {user?.email || "Logged-in user"}
              </div>
            ) : (
              <div className="min-w-0 flex-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                Register/Login required for newsletter subscription.
              </div>
            )}
            <motion.button
              type="submit"
              disabled={submitting || checking || !isAuthenticated}
              whileHover={{ scale: submitting || !isAuthenticated ? 1 : 1.02 }}
              whileTap={{ scale: submitting || !isAuthenticated ? 1 : 0.98 }}
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
          </form>
        ) : null}
      </div>

      <AnimatePresence mode="wait">
        {subscribed && !isCompact ? (
          <motion.div
            key="ok"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              <FiCheck className="h-4 w-4 shrink-0" />
              Already subscribed. Watch your inbox for weekly city gems.
            </p>
          </motion.div>
        ) : null}
        {!isAuthenticated && !isCompact ? (
          <motion.p
            key="auth-note"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-3 text-sm text-slate-600"
          >
            Create an account on the{" "}
            <Link to="/register" className="font-semibold text-brand-600">
              register page
            </Link>{" "}
            and subscribe in one click.
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
