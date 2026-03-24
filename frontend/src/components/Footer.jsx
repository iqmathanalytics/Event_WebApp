import { Link } from "react-router-dom";
import NewsletterSignup from "./NewsletterSignup";

function Footer() {
  return (
    <footer className="footer-safe-bottom border-t border-slate-200 bg-gradient-to-b from-slate-50/80 to-white">
      <div className="container-page py-10">
        <div className="mb-8">
          <NewsletterSignup
            variant="footer"
            title="Weekly city picks"
            description="Events, deals, and lifestyle—straight to your inbox."
          />
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
