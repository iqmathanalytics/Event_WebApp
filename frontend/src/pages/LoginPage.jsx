import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { loginUser, loginWithGoogle } from "../services/authService";
import AuthBrandLogo from "../components/AuthBrandLogo";
import LoginDiscoverGallery from "../components/LoginDiscoverGallery";
import GoogleContinueButton, { AuthDividerOr, isGoogleAuthConfigured } from "../components/GoogleContinueButton";
import { safeReturnPath } from "../utils/postGoogleSignIn";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function userSafeSignInMessage(raw) {
  const s = String(raw || "").trim();
  if (!s) {
    return "Something went wrong. Try again.";
  }
  if (/staff|admin(?:istrator)?(\s|$)|\bportal\b/i.test(s)) {
    return "This sign-in method isn't available for this account.";
  }
  return s;
}

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  useRouteContentReady(loading || googleLoading);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const response = await loginUser(form);
      const payload = response?.data;
      if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
        throw new Error("Invalid login response");
      }
      login(payload);
      const next = safeReturnPath(searchParams.get("next"));
      navigate(next || "/dashboard/user");
    } catch (_err) {
      setError("We couldn't sign you in. Check your email and password and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <div className="mx-auto flex w-full max-w-[88rem] flex-col gap-6 sm:gap-7 lg:grid lg:min-h-[min(54rem,calc(100svh-6rem))] lg:grid-cols-[min(100%,26.5rem)_minmax(0,1fr)] lg:grid-rows-1 lg:items-stretch lg:gap-7 xl:min-h-[min(56rem,calc(100svh-5.5rem))] xl:grid-cols-[27.5rem_minmax(0,1fr)] xl:gap-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="w-full min-h-0 lg:flex lg:h-full lg:min-h-0"
        >
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_28px_64px_-24px_rgba(15,23,42,0.2)]">
            <div
              className="h-1 w-full shrink-0 bg-gradient-to-r from-brand-500 via-fuchsia-500 to-cyan-500"
              aria-hidden
            />
            <div className="shrink-0 px-5 pb-1 pt-5 text-center sm:px-7 sm:pt-6 lg:px-6 lg:pt-6 xl:px-7">
              <AuthBrandLogo compact />
              <h1 className="mt-1.5 text-xl font-bold tracking-tight text-slate-900 sm:mt-2 sm:text-2xl">Welcome back</h1>
              <p className="mx-auto mt-1 max-w-[20rem] text-xs leading-snug text-slate-600 text-balance sm:text-sm sm:leading-relaxed">
                Sign in to save favorites, unlock offers, and keep track of your Yay! Tickets world.
              </p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col px-5 pb-3 pt-4 sm:px-7 lg:px-6 xl:px-7">
              <form onSubmit={onSubmit} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="login-email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="Email"
                    value={form.email}
                    onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="login-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    placeholder="Password"
                    value={form.password}
                    onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/90 px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-500/20"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? "Signing in..." : "Sign in"}
                </button>
              </form>

              {isGoogleAuthConfigured() ? (
                <>
                  <AuthDividerOr className="!my-3 sm:!my-3.5" />
                  <GoogleContinueButton
                    disabled={loading || googleLoading}
                    onCredential={async (credential) => {
                        if (credential == null) {
                          setError("Google sign-in was cancelled or could not complete.");
                          return;
                        }
                        setError("");
                        setGoogleLoading(true);
                        try {
                          const response = await loginWithGoogle(credential);
                          const payload = response?.data;
                          if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
                            throw new Error("Invalid Google login response");
                          }
                          login(payload);
                          const next = safeReturnPath(searchParams.get("next"));
                          navigate(next || "/dashboard/user", { replace: true });
                        } catch (err) {
                          setError(
                            userSafeSignInMessage(
                              err?.response?.data?.message || err?.message || "Google sign-in failed. Try again."
                            )
                          );
                        } finally {
                          setGoogleLoading(false);
                        }
                      }}
                  />
                    {googleLoading ? <p className="mt-1.5 text-center text-xs text-slate-500 sm:text-sm">Signing in with Google…</p> : null}
                  </>
                ) : null}

              {error ? (
                <p
                  role="alert"
                  className="mt-3 max-w-full text-pretty break-words text-center text-sm font-medium leading-relaxed text-rose-600 sm:text-[0.9375rem]"
                >
                  {error}
                </p>
              ) : null}
            </div>

            <div className="relative z-[1] shrink-0 border-t border-slate-200/70 bg-white px-5 py-4 text-center sm:px-7 sm:py-4 lg:px-6 xl:px-7">
              <p className="text-sm leading-normal text-slate-600">
                New here?{" "}
                <Link to="/register" className="font-semibold text-brand-600 underline-offset-2 hover:underline">
                  Create an account
                </Link>
              </p>
              <Link to="/" className="mt-2 inline-block text-xs font-medium text-slate-500 transition hover:text-slate-800">
                ← Back to home
              </Link>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: "easeOut", delay: 0.05 }}
          className="flex min-h-[min(58vh,420px)] w-full min-w-0 flex-col sm:min-h-[min(60vh,460px)] lg:h-full lg:min-h-0"
        >
          <LoginDiscoverGallery />
        </motion.div>
      </div>
    </div>
  );
}

export default LoginPage;
