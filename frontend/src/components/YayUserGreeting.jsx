/**
 * Branded session greeting: "Yay! – [Name]"
 * Use variant for contrast on light vs dark surfaces.
 */
function YayUserGreeting({
  name,
  variant = "light",
  size = "md",
  className = ""
}) {
  const raw = String(name || "").trim();
  const display = raw || "there";

  const sizeClasses =
    size === "sm"
      ? { yay: "text-xs", dash: "text-[10px]", name: "text-xs" }
      : size === "lg"
        ? { yay: "text-lg sm:text-xl", dash: "text-base text-slate-400", name: "text-lg sm:text-xl" }
        : { yay: "text-sm sm:text-base", dash: "text-xs sm:text-sm", name: "text-sm sm:text-base" };

  const yayGradient =
    variant === "dark"
      ? "bg-gradient-to-r from-rose-200 via-fuchsia-200 to-indigo-200 bg-clip-text text-transparent"
      : "bg-gradient-to-r from-rose-600 via-fuchsia-600 to-indigo-600 bg-clip-text text-transparent";

  const dashTone = variant === "dark" ? "text-white/45" : "text-slate-400";
  const nameTone = variant === "dark" ? "text-white" : "text-slate-900";

  return (
    <span
      className={`inline-flex min-w-0 max-w-full items-center gap-1 sm:gap-1.5 ${className}`}
      title={`Yay! – ${display}`}
    >
      <span className={`shrink-0 font-extrabold tracking-tight ${sizeClasses.yay} ${yayGradient}`}>Yay!</span>
      <span className={`shrink-0 font-light leading-none ${sizeClasses.dash} ${dashTone}`} aria-hidden>
        –
      </span>
      <span className={`min-w-0 truncate font-semibold leading-tight ${sizeClasses.name} ${nameTone}`}>{display}</span>
    </span>
  );
}

export default YayUserGreeting;
