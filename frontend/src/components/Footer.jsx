import { Link } from "react-router-dom";
import { FiArrowRight, FiMail } from "react-icons/fi";
import { FaFacebookF } from "react-icons/fa";
import { Instagram, Youtube } from "lucide-react";
import { BRAND_SOCIAL_LINKS, BRAND_SUPPORT_EMAIL } from "../constants/brand";

const SOCIAL_BUTTONS = [
  {
    id: "instagram",
    href: BRAND_SOCIAL_LINKS.instagram,
    label: "Instagram",
    Icon: Instagram,
    className:
      "border-pink-200/80 bg-gradient-to-br from-pink-50 to-rose-50 text-pink-600 hover:border-pink-300 hover:from-pink-100 hover:to-rose-100 hover:text-pink-700"
  },
  {
    id: "facebook",
    href: BRAND_SOCIAL_LINKS.facebook,
    label: "Facebook",
    Icon: FaFacebookF,
    className:
      "border-blue-200/80 bg-gradient-to-br from-blue-50 to-sky-50 text-blue-600 hover:border-blue-300 hover:from-blue-100 hover:to-sky-100 hover:text-blue-700"
  },
  {
    id: "youtube",
    href: BRAND_SOCIAL_LINKS.youtube,
    label: "YouTube",
    Icon: Youtube,
    className:
      "border-red-200/80 bg-gradient-to-br from-red-50 to-orange-50 text-red-600 hover:border-red-300 hover:from-red-100 hover:to-orange-100 hover:text-red-700"
  }
];

function Footer() {
  return (
    <footer className="footer-safe-bottom border-t border-slate-200 bg-gradient-to-b from-slate-50/80 to-white">
      <div className="container-page py-10">
        <div className="mb-8">
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-soft backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-600/10 text-brand-700">
                <FiMail className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900 sm:text-lg">Weekly city picks</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">
                  Events, deals, and lifestyle—subscribe on the next screen.
                </p>
              </div>
            </div>
            <Link
              to="/newsletter"
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-brand-600 px-6 text-sm font-semibold text-white shadow-md shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98] sm:w-auto lg:min-h-0 lg:rounded-2xl lg:py-3"
            >
              Subscribe
              <FiArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </div>
        <div className="flex flex-col gap-5 border-t border-slate-200/80 pt-7 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:pt-8">
          <div className="flex flex-col gap-3.5">
            <p className="text-sm text-slate-500">© {new Date().getFullYear()} Book My Tickets</p>
            <div className="flex flex-wrap items-center gap-2.5">
              {SOCIAL_BUTTONS.map(({ id, href, label, Icon, className }) => (
                <a
                  key={id}
                  href={href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={`Follow us on ${label}`}
                  title={label}
                  className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] lg:h-10 lg:w-10 ${className}`}
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </a>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-0 text-sm text-slate-600 sm:flex sm:min-w-0 sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1">
            <a
              href={`mailto:${BRAND_SUPPORT_EMAIL}`}
              className="col-span-2 inline-flex min-h-11 items-center gap-1.5 transition hover:text-slate-900 sm:col-auto lg:min-h-0"
            >
              <FiMail className="h-3.5 w-3.5" aria-hidden />
              <span className="truncate">{BRAND_SUPPORT_EMAIL}</span>
            </a>
            <Link to="/newsletter" className="inline-flex min-h-11 items-center transition hover:text-slate-900 lg:min-h-0">
              City Newsletter
            </Link>
            <Link to="/privacy" className="inline-flex min-h-11 items-center transition hover:text-slate-900 lg:min-h-0">
              Privacy
            </Link>
            <Link to="/terms" className="inline-flex min-h-11 items-center transition hover:text-slate-900 lg:min-h-0">
              Terms
            </Link>
            <Link to="/contact" className="inline-flex min-h-11 items-center transition hover:text-slate-900 lg:min-h-0">
              Contact Support
            </Link>
            <Link to="/events" className="inline-flex min-h-11 items-center transition hover:text-slate-900 lg:min-h-0">
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
