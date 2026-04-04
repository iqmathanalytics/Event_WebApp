import { Link } from "react-router-dom";
import { FiArrowRight, FiMail } from "react-icons/fi";

function Footer() {
  return (
    <footer className="footer-safe-bottom border-t border-slate-200 bg-gradient-to-b from-slate-50/80 to-white">
      <div className="container-page py-10">
        <div className="mb-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-soft backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
                <FiMail className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Weekly city picks</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Events, deals, and lifestyle—subscribe on the next screen.
                </p>
              </div>
            </div>
            <Link
              to="/newsletter"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700"
            >
              Subscribe
              <FiArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-4 border-t border-slate-200/80 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} Yay! Tickets</p>
          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <Link to="/newsletter" className="transition hover:text-slate-900">
              City Newsletter
            </Link>
            <Link to="/contact" className="transition hover:text-slate-900">
              Contact Support
            </Link>
            <Link to="/events" className="transition hover:text-slate-900">
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
