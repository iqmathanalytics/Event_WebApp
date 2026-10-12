import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

function NotFoundPage() {
  useRouteContentReady(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="container-page py-16 text-center lg:py-20"
    >
      <div className="mx-auto max-w-sm rounded-3xl border border-slate-200 bg-white px-5 py-10 shadow-sm lg:max-w-none lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
      <h1 className="text-3xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-base leading-relaxed text-slate-600">The page you requested is unavailable or has been moved.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] lg:min-h-0 lg:rounded-xl"
      >
        Return to Homepage
      </Link>
      </div>
    </motion.div>
  );
}

export default NotFoundPage;
