/**
 * Keeps wide data tables inside the dashboard card:
 * horizontal + vertical scroll instead of expanding the page.
 */
export default function ScrollableTableFrame({
  children,
  className = "",
  maxHeightClass = "max-h-[min(65vh,40rem)]",
  minWidthClass = "min-w-[1100px]",
  bordered = true
}) {
  return (
    <div
      className={[
        "w-full min-w-0 max-w-full overflow-auto overscroll-contain",
        maxHeightClass,
        bordered ? "rounded-xl border border-slate-200 bg-white" : "",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={minWidthClass}>{children}</div>
    </div>
  );
}
