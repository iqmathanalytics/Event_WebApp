import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls to top on real route (pathname) changes only.
 * Query/hash updates on the same page (e.g. dashboard host tabs) keep scroll position.
 */
function ScrollToTop() {
  const { pathname } = useLocation();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    if (prevPathnameRef.current === pathname) {
      return;
    }
    prevPathnameRef.current = pathname;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pathname]);

  return null;
}

export default ScrollToTop;
