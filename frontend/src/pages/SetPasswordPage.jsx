import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import useAuth from "../hooks/useAuth";
import AuthBrandLogo from "../components/AuthBrandLogo";
import { completeSetPassword, validateSetPasswordToken } from "../services/authService";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function passwordOk(value) {
  return String(value || "").length >= 8;
}

export default function SetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const token = String(searchParams.get("token") || "").trim();

  const [phase, setPhase] = useState("validating");
  const [account, setAccount] = useState({ email: "", name: "" });
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useRouteContentReady(phase === "validating" || loading);

  useEffect(() => {
    if (!token) {
      setPhase("invalid");
      setError("This link is missing a security token. Open the link from your booking confirmation email.");
      return;
    }

    let cancelled = false;
    (async () => {
      setPhase("validating");
      setError("");
      try {
        const res = await validateSetPasswordToken(token);
        if (cancelled) return;
        setAccount({
          email: res?.data?.email || "",
          name: res?.data?.name || ""
        });
        setPhase("ready");
      } catch (err) {
        if (cancelled) return;
        setPhase("invalid");
        setError(
          err?.response?.data?.message ||
            "This link is invalid or has expired. Use the latest email from your booking, or sign in if you already set a password."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const passwordsMatch = useMemo(
    () => form.password === form.confirm && passwordOk(form.password),
    [form.password, form.confirm]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!passwordOk(form.password)) {
      setError("Use at least 8 characters for your password.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setLoading(true);
      const res = await completeSetPassword({ token, password: form.password });
      const payload = res?.data;
      if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
        throw new Error("Invalid response");
      }
      login(payload);
      setDone(true);
      window.setTimeout(() => navigate("/dashboard/user", { replace: true }), 1200);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save your password. Try again or contact support.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10 sm:py-14">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_28px_64px_-24px_rgba(15,23,42,0.18)]"
      >
        <div className="h-1 w-full bg-gradient-to-r from-brand-500 via-fuchsia-500 to-cyan-500" aria-hidden />
        <div className="px-6 pb-8 pt-7 sm:px-8">
          <div className="text-center">
            <AuthBrandLogo compact />
            <div className="mx-auto mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
              {done ? <CheckCircle2 className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
              {done ? "You're all set" : "Create your password"}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {done
                ? "Taking you to My Hub…"
                : "We created a My Hub account from your booking. Choose a password to sign in anytime and view your tickets."}
            </p>
          </div>

          {phase === "validating" ? (
            <div className="mt-8 flex flex-col items-center gap-3 text-sm text-slate-600">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              Verifying your secure link…
            </div>
          ) : null}

          {phase === "invalid" ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
              <p className="text-center text-sm text-slate-600">
                Already have a password?{" "}
                <Link to="/login" className="font-semibold text-brand-700 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          ) : null}

          {phase === "ready" && !done ? (
            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              {account.email ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">My Hub account</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">{account.email}</p>
                  {account.name ? <p className="text-xs text-slate-600">{account.name}</p> : null}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <label htmlFor="set-password" className="text-sm font-semibold text-slate-800">
                  New password
                </label>
                <input
                  id="set-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="set-password-confirm" className="text-sm font-semibold text-slate-800">
                  Confirm password
                </label>
                <input
                  id="set-password-confirm"
                  type="password"
                  autoComplete="new-password"
                  value={form.confirm}
                  onChange={(e) => setForm((prev) => ({ ...prev, confirm: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                  placeholder="Re-enter your password"
                  required
                  minLength={8}
                />
              </div>

              {error ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
              ) : null}

              <button
                type="submit"
                disabled={loading || !passwordsMatch}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save password &amp; open My Hub
              </button>

              <p className="text-center text-xs text-slate-500">
                This link is personal and expires after 72 hours.{" "}
                <Link to="/login" className="font-medium text-slate-700 hover:underline">
                  Sign in instead
                </Link>
              </p>
            </form>
          ) : null}

          {done ? (
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
