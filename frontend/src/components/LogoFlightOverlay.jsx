import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BRAND_LOGO_CROSSFADE_DURATION,
  BRAND_LOGO_HANDOFF_DURATION,
  BRAND_LOGO_HANDOFF_EASE
} from "../constants/brandMotion";

/**
 * Single flying logo: move splash → header, then fade overlay out while header fades in.
 * Move completion uses onAnimationComplete (no setTimeout drift vs Framer).
 */
function LogoFlightOverlay({ flight, onMoveComplete, onFadeComplete }) {
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState("move");
  const phaseRef = useRef(phase);
  const moveDoneRef = useRef(false);
  const fadeDoneRef = useRef(false);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    setPhase("move");
    moveDoneRef.current = false;
    fadeDoneRef.current = false;
    phaseRef.current = "move";
  }, [flight]);

  if (!flight || reduceMotion) {
    return null;
  }

  const { from, to } = flight;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[300] overflow-visible will-change-[left,top,width,height,opacity]"
      initial={{
        left: from.left,
        top: from.top,
        width: from.width,
        height: from.height,
        opacity: 1
      }}
      animate={
        phase === "move"
          ? {
              left: to.left,
              top: to.top,
              width: to.width,
              height: to.height,
              opacity: 1
            }
          : {
              left: to.left,
              top: to.top,
              width: to.width,
              height: to.height,
              opacity: 0
            }
      }
      transition={
        phase === "move"
          ? { duration: BRAND_LOGO_HANDOFF_DURATION, ease: BRAND_LOGO_HANDOFF_EASE }
          : { duration: BRAND_LOGO_CROSSFADE_DURATION, ease: BRAND_LOGO_HANDOFF_EASE }
      }
      onAnimationComplete={() => {
        if (phaseRef.current === "move" && !moveDoneRef.current) {
          moveDoneRef.current = true;
          onMoveComplete?.();
          setPhase("fade");
          phaseRef.current = "fade";
          return;
        }
        if (phaseRef.current === "fade" && !fadeDoneRef.current) {
          fadeDoneRef.current = true;
          onFadeComplete?.();
        }
      }}
      style={{ position: "fixed" }}
    >
      <img
        src="/branding/yay-tickets-logo.png"
        alt=""
        className="h-full w-full object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        decoding="async"
        draggable={false}
      />
    </motion.div>
  );
}

export default LogoFlightOverlay;
