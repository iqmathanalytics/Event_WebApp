import { useState } from "react";
import { motion } from "framer-motion";

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const onSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mx-auto max-w-2xl space-y-4"
    >
      <h1 className="text-2xl font-bold sm:text-3xl">Contact Support</h1>
      <p className="text-sm text-slate-600">Questions, partnership inquiries, or product feedback? Our team is ready to help.</p>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <input required placeholder="Name" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        <input
          required
          type="email"
          placeholder="Email"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <input required placeholder="Subject" className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm" />
        <textarea
          required
          rows={5}
          placeholder="Message"
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
        />
        <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
          Send Message
        </button>
      </form>
      {submitted ? <p className="text-sm font-semibold text-emerald-700">Your message has been received. We will reply shortly.</p> : null}
    </motion.div>
  );
}

export default ContactPage;
