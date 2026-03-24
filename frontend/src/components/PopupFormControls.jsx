import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiCalendar, FiChevronDown } from "react-icons/fi";
import AirbnbDatePickerPanel from "./AirbnbDatePickerPanel";

function useFloatingPanel(isOpen, triggerRef, panelRef) {
  const [position, setPosition] = useState({ top: 0, left: 8, width: 240 });

  useLayoutEffect(() => {
    if (!isOpen || !triggerRef.current) {
      return;
    }

    const update = () => {
      const rect = triggerRef.current.getBoundingClientRect();
      const panelRect = panelRef.current?.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const spacing = 8;
      const width = Math.min(Math.max(rect.width, 220), viewportWidth - spacing * 2);
      const panelHeight = panelRect?.height || 360;

      let left = rect.left;
      if (left + width > viewportWidth - spacing) {
        left = Math.max(spacing, viewportWidth - width - spacing);
      }

      const belowTop = rect.bottom + spacing;
      const aboveTop = rect.top - panelHeight - spacing;
      const openUp = belowTop + panelHeight > viewportHeight - spacing && aboveTop >= spacing;
      const top = openUp
        ? aboveTop
        : Math.min(belowTop, Math.max(spacing, viewportHeight - panelHeight - spacing));

      setPosition({ top, left, width });
    };

    update();
    window.requestAnimationFrame(update);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [isOpen, panelRef, triggerRef]);

  return position;
}

export function PopupSelect({ value, onChange, options, placeholder = "Select option" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const selected = useMemo(
    () => options.find((item) => String(item.value) === String(value)),
    [options, value]
  );
  const position = useFloatingPanel(open, triggerRef, panelRef);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        <span className={selected ? "text-slate-800" : "text-slate-400"}>
          {selected?.label || placeholder}
        </span>
        <FiChevronDown className="text-slate-500" />
      </button>

      <AnimatePresence>
        {open
          ? createPortal(
              <>
                <div
                  className="fixed inset-0 z-[319]"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                  }}
                />
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    position: "fixed",
                    top: position.top,
                    left: position.left,
                    width: position.width
                  }}
                  className="z-[320] rounded-3xl border border-slate-200 bg-white p-2 shadow-soft"
                >
                  <div className="hide-scrollbar max-h-60 overflow-y-auto">
                    {options.map((option) => (
                      <button
                        key={String(option.value)}
                        type="button"
                        onClick={() => {
                          onChange(String(option.value));
                          setOpen(false);
                        }}
                        onMouseDown={(event) => event.stopPropagation()}
                        className="flex w-full items-center rounded-xl px-2.5 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>,
              document.body
            )
          : null}
      </AnimatePresence>
    </>
  );
}

export function PopupDateField({ value, onChange, placeholder = "Select date" }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const position = useFloatingPanel(open, triggerRef, panelRef);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex w-full items-center justify-between rounded-2xl border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-800 shadow-sm transition hover:bg-slate-50"
      >
        <span className={value ? "text-slate-800" : "text-slate-400"}>{value || placeholder}</span>
        <FiCalendar className="text-slate-500" />
      </button>

      <AnimatePresence>
        {open
          ? createPortal(
              <>
                <div
                  className="fixed inset-0 z-[319]"
                  onMouseDown={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                  }}
                />
                <motion.div
                  ref={panelRef}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                  style={{
                    position: "fixed",
                    top: position.top,
                    left: position.left,
                    width: Math.max(position.width, 320)
                  }}
                  className="z-[320] rounded-3xl border border-slate-200 bg-white p-3 shadow-soft"
                >
                  <AirbnbDatePickerPanel value={value} onChange={onChange} closeOnSelect onClose={() => setOpen(false)} />
                </motion.div>
              </>,
              document.body
            )
          : null}
      </AnimatePresence>
    </>
  );
}

