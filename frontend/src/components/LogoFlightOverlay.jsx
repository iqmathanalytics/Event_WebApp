import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BRAND_LOGO_CROSSFADE_DURATION,
  BRAND_LOGO_HANDOFF_DURATION,
  BRAND_LOGO_HANDOFF_EASE
} from "../constants/brandMotion";
import { BRAND_LOGO_URL } from "../constants/brand";

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
  const fromW = Math.max(1, Number(from.width) || 1);
  const fromH = Math.max(1, Number(from.height) || 1);
  const scaleX = Math.max(0.01, (Number(to.width) || fromW) / fromW);
  const scaleY = Math.max(0.01, (Number(to.height) || fromH) / fromH);
  const target = {
    x: Number(to.left) || 0,
    y: Number(to.top) || 0,
    scaleX,
    scaleY,
    opacity: 1
  };

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-[300] overflow-visible will-change-transform"
      initial={{
        x: Number(from.left) || 0,
        y: Number(from.top) || 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1
      }}
      animate={phase === "move" ? target : { ...target, opacity: 0 }}
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
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        width: fromW,
        height: fromH,
        transformOrigin: "0 0"
      }}
    >
      <img
        src={BRAND_LOGO_URL}
        alt=""
        className="h-full w-full object-contain drop-shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
        decoding="async"
        draggable={false}
      />
    </motion.div>
  );
}

export default LogoFlightOverlay;
