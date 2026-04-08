import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FiCalendar, FiChevronDown } from "react-icons/fi";

function FilterPopupField({
  label,
  value,
  isActive,
  onToggle,
  panelContent,
  panelClassName = "w-full min-w-[220px]",
  usePortal = true,
  /** Must sit above app modals (often z-[221]); portal panels used to default to z-[220] and hid behind them. */
  portalZIndexClass = "z-[260]"
}) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const repositionRafRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 8 });
  const [portalWidth, setPortalWidth] = useState(null);
  const showDateIcon = /date|when/i.test(String(label || ""));
  const triggerClientOk =
    Boolean(triggerRef.current) && triggerRef.current.getClientRects().length > 0;
  const canPortal = Boolean(usePortal && isActive && triggerClientOk);

  const updatePortalPosition = useCallback(() => {
    if (!usePortal || !isActive || !triggerRef.current || triggerRef.current.getClientRects().length === 0) {
      return;
    }
    const triggerRect = triggerRef.current.getBoundingClientRect();
    const panelRect = panelRef.current?.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const spacing = 8;
    const shouldMatchTriggerWidth = /\bw-full\b/.test(panelClassName);
    const nextWidth = shouldMatchTriggerWidth
      ? Math.min(Math.max(triggerRect.width, 180), viewportWidth - spacing * 2)
      : null;
    const panelWidth = nextWidth || panelRect?.width || 420;
    const panelHeight = panelRect?.height || 360;

    let left = triggerRect.left;
    if (left + panelWidth > viewportWidth - spacing) {
      left = Math.max(spacing, viewportWidth - panelWidth - spacing);
    }

    const belowTop = triggerRect.bottom + spacing;
    const aboveTop = triggerRect.top - panelHeight - spacing;
    const shouldOpenUp = belowTop + panelHeight > viewportHeight - spacing && aboveTop >= spacing;
    const top = shouldOpenUp
      ? aboveTop
      : Math.min(belowTop, Math.max(spacing, viewportHeight - panelHeight - spacing));

    setPortalWidth(nextWidth);
    setPortalPosition({ top, left });
  }, [isActive, panelClassName, usePortal]);

  const scheduleReposition = useCallback(() => {
    if (!usePortal || !isActive) {
      return;
    }
    if (repositionRafRef.current != null) {
      cancelAnimationFrame(repositionRafRef.current);
    }
    repositionRafRef.current = requestAnimationFrame(() => {
      repositionRafRef.current = null;
      updatePortalPosition();
    });
  }, [usePortal, isActive, updatePortalPosition]);

  useLayoutEffect(() => {
    if (!usePortal || !isActive) {
      return undefined;
    }

    updatePortalPosition();
    scheduleReposition();

    const onViewportChange = () => scheduleReposition();
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);

    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", onViewportChange);
      vv.addEventListener("scroll", onViewportChange);
    }

    let innerObserveRaf = null;
    const outerObserveRaf = requestAnimationFrame(() => {
      innerObserveRaf = requestAnimationFrame(() => {
        innerObserveRaf = null;
        const el = panelRef.current;
        if (el && typeof ResizeObserver !== "undefined") {
          resizeObserverRef.current = new ResizeObserver(() => scheduleReposition());
          resizeObserverRef.current.observe(el);
        }
      });
    });

    return () => {
      cancelAnimationFrame(outerObserveRaf);
      if (innerObserveRaf != null) {
        cancelAnimationFrame(innerObserveRaf);
      }
      if (repositionRafRef.current != null) {
        cancelAnimationFrame(repositionRafRef.current);
        repositionRafRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      if (vv) {
        vv.removeEventListener("resize", onViewportChange);
        vv.removeEventListener("scroll", onViewportChange);
      }
    };
  }, [isActive, updatePortalPosition, usePortal, scheduleReposition]);

  /* No translateY on portal: transforms + scroll reposition caused the calendar to drift from the trigger. */
  const panelNode = (
    <motion.div
      ref={panelRef}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      data-filter-popup-portal={usePortal ? "true" : "false"}
      key={`${label}-panel`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      style={
        usePortal
          ? {
              position: "fixed",
              top: portalPosition.top,
              left: portalPosition.left,
              width: portalWidth || undefined
            }
          : undefined
      }
      className={`${usePortal ? portalZIndexClass : "absolute left-0 top-[calc(100%+8px)] z-30"} max-h-[min(85dvh,calc(100vh-24px))] overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 bg-white p-3 shadow-soft ${panelClassName}`}
    >
      <div onMouseDown={(event) => event.stopPropagation()}>{panelContent}</div>
    </motion.div>
  );

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onToggle}
        className={`w-full rounded-2xl px-4 py-3 text-left transition duration-200 ${
          isActive ? "bg-slate-100 ring-1 ring-slate-200" : "hover:bg-slate-50"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1 text-xs font-semibold text-slate-900">
              {showDateIcon ? <FiCalendar size={12} className="text-slate-500" aria-hidden="true" /> : null}
              {label}
            </p>
            <p className="truncate pt-0.5 text-sm text-slate-600">{value}</p>
          </div>
          <FiChevronDown
            className={`shrink-0 text-slate-500 transition-transform duration-200 ${isActive ? "rotate-180" : ""}`}
            size={16}
            aria-hidden="true"
          />
        </div>
      </button>

      {usePortal ? (
        canPortal ? createPortal(panelNode, document.body) : null
      ) : (
        <AnimatePresence mode="wait">{isActive ? panelNode : null}</AnimatePresence>
      )}
    </div>
  );
}

export default FilterPopupField;
