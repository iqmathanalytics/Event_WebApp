import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";

/**
 * Replace legacy numeric URLs with canonical public_slug paths.
 */
export function useCanonicalListingUrl(listing, buildPath) {
  const { slug } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!listing || !slug || !buildPath) {
      return;
    }
    const canonical = buildPath(listing);
    const current = `${window.location.pathname}`;
    if (canonical && canonical !== current) {
      navigate(canonical, { replace: true });
    }
  }, [listing, slug, buildPath, navigate]);
}
