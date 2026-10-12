import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { loginStaff } from "../services/authService";
import AuthBrandLogo from "../components/AuthBrandLogo";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function StaffLoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useRouteContentReady(loading);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const response = await loginStaff(form);
      const payload = response?.data;
      if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
        throw new Error("Invalid login response");
      }
      login(payload);
      const isAdmin = payload?.user?.role === "admin";
      const canOrganize = payload?.user?.organizer_enabled === 1 || payload?.user?.role === "organizer";
      navigate(
        isAdmin
          ? "/dashboard/admin"
          : canOrganize
            ? { pathname: "/dashboard/user", hash: "host-events" }
            : "/dashboard/user"
      );
    } catch (_err) {
      setError("We couldn't sign you in. Check your email and password and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mx-auto w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-soft"
    >
      <div className="h-1 w-full bg-gradient-to-r from-slate-800 via-slate-600 to-slate-400" aria-hidden />
      <div className="p-5 sm:p-6">
        <div className="mb-3 flex justify-center lg:mb-0 lg:justify-start">
          <AuthBrandLogo />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Staff Sign In</h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">
          For administrator and organizer access only.
        </p>
        <form onSubmit={onSubmit} className="mt-5 space-y-3.5">
          <input
            type="email"
            required
            autoComplete="username"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 lg:min-h-0"
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            className="min-h-11 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-slate-900 lg:min-h-0"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900 transition active:scale-[0.98] disabled:opacity-60 lg:min-h-0 lg:rounded-xl"
          >
            {loading ? "Signing in..." : "Sign in to Staff Portal"}
          </button>
        </form>
        {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
        <p className="mt-4 text-center text-sm text-slate-600 lg:text-left">
          Regular user?{" "}
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center font-semibold text-brand-600 lg:min-h-0"
          >
            Use User Sign In
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

export default StaffLoginPage;
