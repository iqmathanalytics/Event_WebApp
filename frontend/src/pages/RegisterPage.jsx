import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { register as registerRequest, registerWithGoogle } from "../services/authService";
import useAuth from "../hooks/useAuth";
import AuthBrandLogo from "../components/AuthBrandLogo";
import GoogleContinueButton, { AuthDividerOr, isGoogleAuthConfigured } from "../components/GoogleContinueButton";
import { safeReturnPath } from "../utils/postGoogleSignIn";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import { REGISTRATION_DISCLAIMER_PARAGRAPHS } from "../constants/registerDisclaimer";

const mobileOk = (s) => {
  const t = String(s || "").trim();
  if (!t) {
    return true;
  }
  return t.length >= 8 && t.length <= 25 && /^[0-9+()\-\s]+$/.test(t);
};

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false);
  useRouteContentReady(loading || googleLoading);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!agreedDisclaimer) {
      setError("Please confirm that you have read and agree to the terms above.");
      return;
    }
    if (!mobileOk(form.mobile_number)) {
      setError(
        "If you enter a phone number, use at least 8 characters (digits, +, spaces, or parentheses), or leave the field blank."
      );
      return;
    }
    try {
      setLoading(true);
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: String(form.email || "").trim().toLowerCase(),
        mobile_number: form.mobile_number.trim() || null,
        password: form.password,
        city_id: null,
        interests: [],
        wants_influencer: false,
        wants_deal: false
      };
      const response = await registerRequest(payload);
      if (response?.data?.accessToken && response?.data?.user) {
        login(response.data);
      }
      const next = safeReturnPath(searchParams.get("next"));
      navigate(next || "/dashboard/user");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration could not be completed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl px-3 sm:px-4 lg:px-0">
      <div
        className="pointer-events-none absolute -left-24 -top-16 h-48 w-48 rounded-full bg-gradient-to-br from-fuchsia-200/70 via-rose-100/40 to-transparent blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -right-20 h-56 w-56 rounded-full bg-gradient-to-tl from-cyan-200/60 via-sky-100/40 to-transparent blur-2xl"
        aria-hidden
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_24px_56px_-20px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/[0.04] backdrop-blur-sm"
      >
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-fuchsia-500 to-cyan-500" aria-hidden />
        <div className="p-6 sm:p-9 sm:pb-10">
          <div className="mb-5 flex justify-center">
            <AuthBrandLogo compact />
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">New member registration</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
              Create your Yay! Eventz account
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]">
              Welcome to the side of the city that stays alive after dark—where the lights, the crowds, and the quiet
              corners all have a story. Curate your nights, lift up what you love, and make this place feel a little more
              yours.
            </p>
          </div>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="text"
                required
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
              />
              <input
                type="text"
                required
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none sm:col-span-1"
              />
            </div>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={form.email}
              onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
            />
            <input
              type="text"
              autoComplete="tel"
              placeholder="Mobile phone (optional)"
              value={form.mobile_number}
              onChange={(e) => setForm((s) => ({ ...s, mobile_number: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
            />

            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/90 p-4 text-left sm:p-5">
              <h2 className="text-sm font-bold text-slate-900">Acknowledgment &amp; terms</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Please review the following before you register.
              </p>
              <div className="mt-4 max-h-[min(14rem,38vh)] space-y-3 overflow-y-auto pr-1 text-sm leading-relaxed text-slate-600 sm:max-h-[min(16rem,32vh)]">
                {REGISTRATION_DISCLAIMER_PARAGRAPHS.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200/80 bg-white/80 p-3 sm:p-4">
                <input
                  type="checkbox"
                  checked={agreedDisclaimer}
                  onChange={(e) => setAgreedDisclaimer(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                <span className="text-sm font-semibold leading-snug text-slate-800">
                  I have read and agree to the acknowledgment above, and I understand that the Yay! Eventz Terms of
                  Service and Privacy Policy apply to my use of the platform.
                </span>
              </label>
            </div>

            <input
              type="password"
              required
              autoComplete="new-password"
              placeholder="Password (minimum 8 characters)"
              value={form.password}
              onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:bg-brand-700 disabled:opacity-60"
            >
              {loading ? "Creating your account…" : "Register and open my hub"}
            </button>
          </form>

          {isGoogleAuthConfigured() ? (
            <>
              <AuthDividerOr />
              <GoogleContinueButton
                disabled={loading || googleLoading}
                onCredential={async (credential) => {
                  if (credential == null) {
                    setError("Google sign-in did not complete. Please try again.");
                    return;
                  }
                  setError("");
                  setGoogleLoading(true);
                  try {
                    const response = await registerWithGoogle(credential);
                    const payload = response?.data;
                    if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
                      throw new Error("Invalid Google sign-in response");
                    }
                    login(payload);
                    const next = safeReturnPath(searchParams.get("next"));
                    navigate(next || "/dashboard/user", { replace: true });
                  } catch (err) {
                    setError(err?.response?.data?.message || err?.message || "Google sign-in failed. Try again.");
                  } finally {
                    setGoogleLoading(false);
                  }
                }}
              />
              {googleLoading ? (
                <p className="mt-2 text-center text-sm text-slate-500">Securing your account with Google…</p>
              ) : null}
            </>
          ) : null}

          {error ? <p className="mt-3 text-center text-sm font-medium text-rose-600">{error}</p> : null}

          <p className="mt-6 text-center text-sm text-slate-600">
            Already registered?{" "}
            <Link to="/login" className="font-semibold text-brand-600 underline-offset-2 hover:underline">
              Sign in to your account
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default RegisterPage;
