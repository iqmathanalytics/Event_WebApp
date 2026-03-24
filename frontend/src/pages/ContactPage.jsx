import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiAlertCircle, FiCheck, FiLoader, FiSend } from "react-icons/fi";
import { CONTACT_SUBJECT_OPTIONS } from "../constants/contactSubjects";
import { submitContactMessage } from "../services/contactService";

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition-all duration-200 placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60";

function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const onChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
    setSuccess(false);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject,
        message: form.message.trim()
      });
      setSuccess(true);
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.details?.map((d) => d.message).join(" ") ||
        "Could not send your message. Please try again.";
      setError(typeof msg === "string" ? msg : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-3xl px-4 py-10 sm:py-14"
    >
      <header className="mb-8 space-y-3 text-center sm:mb-10 sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Contact</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">We’re here to help</h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600 sm:mx-0">
          Send us a message—partnerships, support, or feedback. We typically reply within one business day.
        </p>
      </header>

      <motion.div
        layout
        className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_60px_-24px_rgba(15,23,42,0.18)]"
      >
        <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50 to-white px-6 py-5 sm:px-8">
          <h2 className="text-lg font-semibold text-slate-900">Message us</h2>
          <p className="mt-1 text-sm text-slate-500">All fields are required.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <motion.label className="block" whileFocus={{ scale: 1.005 }}>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Name</span>
              <input
                required
                type="text"
                autoComplete="name"
                value={form.name}
                onChange={(e) => onChange("name", e.target.value)}
                placeholder="Alex Johnson"
                disabled={submitting}
                className={fieldClass}
              />
            </motion.label>
            <motion.label className="block" whileFocus={{ scale: 1.005 }}>
              <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Email</span>
              <input
                required
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="you@company.com"
                disabled={submitting}
                className={fieldClass}
              />
            </motion.label>
          </div>

          <motion.label className="block" whileFocus={{ scale: 1.005 }}>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Subject</span>
            <div className="relative">
              <select
                required
                value={form.subject}
                onChange={(e) => onChange("subject", e.target.value)}
                disabled={submitting}
                className={`${fieldClass} appearance-none pr-10`}
              >
                <option value="">Choose a topic</option>
                {CONTACT_SUBJECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">▾</span>
            </div>
          </motion.label>

          <motion.label className="block" whileFocus={{ scale: 1.005 }}>
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">Message</span>
            <textarea
              required
              rows={5}
              value={form.message}
              onChange={(e) => onChange("message", e.target.value)}
              placeholder="Tell us how we can help…"
              disabled={submitting}
              className={`${fieldClass} min-h-[140px] resize-y`}
            />
          </motion.label>

          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
              >
                <FiCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold">Message received</p>
                  <p className="mt-0.5 text-emerald-800/90">Thanks for reaching out—we’ll get back to you shortly.</p>
                </div>
              </motion.div>
            ) : null}
            {error ? (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900"
              >
                <FiAlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
                <p>{error}</p>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.button
            type="submit"
            disabled={submitting}
            whileHover={{ scale: submitting ? 1 : 1.01 }}
            whileTap={{ scale: submitting ? 1 : 0.99 }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-brand-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto sm:min-w-[200px]"
          >
            {submitting ? (
              <>
                <FiLoader className="h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <FiSend className="h-4 w-4" />
                Send message
              </>
            )}
          </motion.button>
        </form>
      </motion.div>
    </motion.div>
  );
}

export default ContactPage;
