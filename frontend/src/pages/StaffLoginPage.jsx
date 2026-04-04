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
      className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-soft"
    >
      <AuthBrandLogo />
      <h1 className="text-2xl font-bold">Staff Sign In</h1>
      <p className="mt-1 text-sm text-slate-600">For administrator and organizer access only.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <button
          type="submit"
          className="w-full rounded-xl border border-slate-900 px-4 py-2.5 text-sm font-semibold text-slate-900"
        >
          {loading ? "Signing in..." : "Sign in to Staff Portal"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
      <p className="mt-4 text-sm text-slate-600">
        Regular user?{" "}
        <Link to="/login" className="font-semibold text-brand-600">
          Use User Sign In
        </Link>
      </p>
    </motion.div>
  );
}

export default StaffLoginPage;
