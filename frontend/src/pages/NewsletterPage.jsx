import { useState } from "react";
import { motion } from "framer-motion";

function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setEmail("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mx-auto max-w-xl space-y-4"
    >
      <h1 className="text-2xl font-bold sm:text-3xl">City Newsletter</h1>
      <p className="text-sm text-slate-600">
        Get handpicked city events, deals, and lifestyle recommendations weekly.
      </p>
      <form onSubmit={onSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
          />
          <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
            Subscribe
          </button>
        </div>
      </form>
      {submitted ? <p className="text-sm font-semibold text-emerald-700">Subscription confirmed. You are all set for weekly updates.</p> : null}
    </motion.div>
  );
}

export default NewsletterPage;
