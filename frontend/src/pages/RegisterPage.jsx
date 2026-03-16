import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { register as registerRequest } from "../services/authService";

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      await registerRequest(form);
      navigate("/login");
    } catch (_err) {
      setError("Registration failed. Email may already exist.");
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
      <h1 className="text-2xl font-bold">Create User Account</h1>
      <p className="mt-1 text-sm text-slate-600">Create your account to discover and book local experiences.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <input
          type="text"
          required
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
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
        <button type="submit" className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
      <p className="mt-4 text-sm text-slate-600">
        Organizer and admin accounts are created only by authorized admins.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600">
          Sign in
        </Link>
      </p>
    </motion.div>
  );
}

export default RegisterPage;
