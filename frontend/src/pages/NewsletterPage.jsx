import { motion } from "framer-motion";
import NewsletterSignup from "../components/NewsletterSignup";
import useCityFilter from "../hooks/useCityFilter";

function NewsletterPage() {
  const { selectedCity } = useCityFilter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:py-14"
    >
      <header className="space-y-3 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Newsletter</p>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">City pulse, in your inbox</h1>
        <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600 sm:mx-0">
          Weekly picks for events, deals, and lifestyle—tailored to how you explore the city. No spam, unsubscribe
          anytime.
        </p>
      </header>

      <NewsletterSignup
        variant="page"
        cityId={selectedCity || undefined}
        title="Get weekly updates"
        description="We’ll use your selected city (from the header) when relevant. You can change it anytime."
      />

      <ul className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
        {[
          "Curated event highlights",
          "Exclusive partner deals",
          "Seasonal city guides",
          "One-click unsubscribe"
        ].map((item) => (
          <li
            key={item}
            className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
            {item}
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export default NewsletterPage;
