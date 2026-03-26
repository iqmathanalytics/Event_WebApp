import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { loginUser, loginWithGoogle } from "../services/authService";
import { fetchMyProfile } from "../services/userService";
import { needsGoogleProfileCompletion } from "../utils/googleProfileCompletion";
import AuthBrandLogo from "../components/AuthBrandLogo";
import GoogleContinueButton, { AuthDividerOr, isGoogleAuthConfigured } from "../components/GoogleContinueButton";
import { safeReturnPath } from "../utils/postGoogleSignIn";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
      setError("Invalid credentials or this account must use staff login.");
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
      <h1 className="text-2xl font-bold">User Sign In</h1>
      <p className="mt-1 text-sm text-slate-600">Access your Yay! Tickets user account.</p>
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
          disabled={loading || googleLoading}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
      {isGoogleAuthConfigured() ? (
        <>
          <AuthDividerOr />
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
                let me;
                try {
                  me = await fetchMyProfile();
                } catch (_err) {
                  me = null;
                }
                if (me && needsGoogleProfileCompletion(me)) {
                  navigate("/complete-signup", {
                    replace: true,
                    state: { next: next || "/dashboard/user" }
                  });
                } else {
                  navigate(next || "/dashboard/user", { replace: true });
                }
              } catch (err) {
                setError(err?.response?.data?.message || err?.message || "Google sign-in failed. Try again.");
              } finally {
                setGoogleLoading(false);
              }
            }}
          />
          {googleLoading ? <p className="mt-2 text-center text-sm text-slate-500">Signing in with Google…</p> : null}
        </>
      ) : null}
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
      <p className="mt-4 text-sm text-slate-600">
        Staff member?{" "}
        <Link to="/staff-login" className="font-semibold text-slate-800 underline">
          Use Staff Portal
        </Link>
      </p>
      <p className="mt-2 text-sm text-slate-600">
        New here?{" "}
        <Link to="/register" className="font-semibold text-brand-600">
          Create an account
        </Link>
      </p>
    </motion.div>
  );
}

export default LoginPage;
