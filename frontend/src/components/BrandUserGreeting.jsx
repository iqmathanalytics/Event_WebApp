/**
 * Session greeting: "Hi, [Name]"
 */
function BrandUserGreeting({ name, variant = "light", size = "md", className = "" }) {
  const raw = String(name || "").trim();
  const display = raw || "there";

  const sizeClasses =
    size === "sm"
      ? { hi: "text-xs font-semibold", name: "text-xs font-bold" }
      : size === "lg"
        ? { hi: "text-base font-semibold sm:text-lg", name: "text-lg font-bold sm:text-xl" }
        : { hi: "text-sm font-semibold", name: "text-sm font-bold sm:text-base" };

  const hiTone = variant === "dark" ? "text-white/75" : "text-slate-500";
  const nameTone = variant === "dark" ? "text-white" : "text-slate-900";

  return (
    <span className={`inline-flex min-w-0 max-w-full items-baseline gap-1 ${className}`} title={`Hi, ${display}`}>
      <span className={`shrink-0 ${sizeClasses.hi} ${hiTone}`}>Hi,</span>
      <span className={`min-w-0 truncate ${sizeClasses.name} ${nameTone}`}>{display}</span>
    </span>
  );
}

export default BrandUserGreeting;
