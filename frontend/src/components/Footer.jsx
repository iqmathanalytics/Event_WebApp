import { Link } from "react-router-dom";

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} City Events & Lifestyle Hub</p>
          <div className="flex gap-4 text-sm text-slate-600">
            <Link to="/newsletter" className="hover:text-slate-900">
              City Newsletter
            </Link>
            <Link to="/contact" className="hover:text-slate-900">
              Contact Support
            </Link>
            <Link to="/events" className="hover:text-slate-900">
              Browse Events
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
