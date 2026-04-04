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
      className="container-page py-20 text-center"
    >
      <h1 className="text-3xl font-bold">Page Not Found</h1>
      <p className="mt-2 text-slate-600">The page you requested is unavailable or has been moved.</p>
      <Link to="/" className="mt-6 inline-block rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
        Return to Homepage
      </Link>
    </motion.div>
  );
}

export default NotFoundPage;
