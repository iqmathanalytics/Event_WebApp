import { motion } from "framer-motion";
import { FiArrowRight, FiCheck, FiMail } from "react-icons/fi";
import NewsletterSignup from "../components/NewsletterSignup";
import useCityFilter from "../hooks/useCityFilter";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function NewsletterPage() {
  const { selectedCity } = useCityFilter();
  useRouteContentReady(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-2xl space-y-8 px-4 py-10 sm:py-14"
    >
      {/* Mobile + Tablet (does not affect desktop). */}
      <div className="lg:hidden space-y-5">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-white/70">Newsletter</p>
              <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight">
                City pulse,
                <span className="block text-white/90">in your inbox</span>
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Weekly picks for events, deals, and lifestyle—tailored to how you explore the city.
              </p>
            </div>
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
              <FiMail className="h-5 w-5" aria-hidden />
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              "Curated event highlights",
              "Exclusive partner deals",
              "Seasonal city guides",
              "One‑click unsubscribe"
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 text-xs font-semibold text-white/90 ring-1 ring-white/10"
              >
                <FiCheck className="h-4 w-4 text-emerald-200" aria-hidden />
                <span className="min-w-0 truncate">{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">Get weekly updates</h2>
              <p className="mt-1 text-sm text-slate-600">
                We’ll use your selected city when relevant. You can change it anytime.
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-700">
              Fast signup
            </span>
          </div>

          <div className="mt-3">
            <NewsletterSignup
              cityId={selectedCity || undefined}
              title={null}
              description={null}
              className="border-none p-0 shadow-none"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <h3 className="text-sm font-semibold text-slate-900">What you’ll get</h3>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {[
              { title: "Best picks", desc: "Our editor’s shortlist—no endless scrolling." },
              { title: "Local deals", desc: "Limited offers from partners you’ll actually use." },
              { title: "Quick read", desc: "Designed to be useful in under 2 minutes." }
            ].map((row) => (
              <div key={row.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                <p className="mt-1 text-xs text-slate-600">{row.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-3">
            <p className="text-xs font-semibold text-slate-700">Prefer reaching out first?</p>
            <a
              href="/contact"
              className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Contact us
              <FiArrowRight className="h-3.5 w-3.5" aria-hidden />
            </a>
          </div>
        </section>
      </div>

      {/* Desktop layout (unchanged). */}
      <div className="hidden lg:block space-y-8">
        <header className="space-y-3 text-center sm:text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Newsletter</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">City pulse, in your inbox</h1>
          <p className="mx-auto max-w-xl text-base leading-relaxed text-slate-600 sm:mx-0">
            Weekly picks for events, deals, and lifestyle—tailored to how you explore the city. No spam, unsubscribe
            anytime.
          </p>
        </header>

        <NewsletterSignup
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
      </div>
    </motion.div>
  );
}

export default NewsletterPage;
