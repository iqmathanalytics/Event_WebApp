import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const SPARKLE_POS = [
  { left: "8%", top: "12%", d: 0 },
  { left: "88%", top: "18%", d: 0.2 },
  { left: "18%", top: "4%", d: 0.4 },
  { left: "72%", top: "8%", d: 0.1 },
  { left: "4%", top: "52%", d: 0.35 },
  { left: "50%", top: "2%", d: 0.25 }
];

/**
 * Animated Yay! Tickets logo for login / register / staff pages.
 */
export default function AuthBrandLogo() {
  return (
    <div className="relative mx-auto mb-2 flex h-[7.5rem] w-full max-w-[300px] items-center justify-center sm:h-[8.5rem] sm:max-w-[340px]">
      {SPARKLE_POS.map((p, i) => (
        <motion.span
          key={i}
          className="pointer-events-none absolute h-1 w-1 rounded-full bg-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.95)]"
          style={{ left: p.left, top: p.top }}
          animate={{
            opacity: [0.25, 1, 0.25],
            scale: [0.65, 1.2, 0.65],
            y: [0, -5, 0]
          }}
          transition={{
            duration: 2.1 + i * 0.07,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.d
          }}
        />
      ))}
      <motion.div
        className="relative z-10 flex items-center justify-center"
        animate={{
          scale: [1, 1.07, 1, 1.05, 1],
          rotate: [0, -2, 2, -1.5, 1.5, -1, 1, 0],
          x: [0, 1, -1, 0.5, -0.5, 0]
        }}
        transition={{
          duration: 4.2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <motion.img
          src="/branding/yay-tickets-logo.png"
          alt="Yay! Tickets"
          className="h-20 w-auto max-w-[min(100%,280px)] object-contain drop-shadow-[0_8px_24px_rgba(15,23,42,0.12)] sm:h-24"
          animate={{
            filter: [
              "drop-shadow(0 0 0px rgba(251,191,36,0))",
              "drop-shadow(0 0 14px rgba(251,191,36,0.45))",
              "drop-shadow(0 0 0px rgba(251,191,36,0))"
            ]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="pointer-events-none absolute -right-1 -top-1 text-amber-400/90"
          animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <Sparkles className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
        </motion.span>
      </motion.div>
    </div>
  );
}
