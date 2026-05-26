/**
 * Home discovery cell: carousel width or full grid cell (landing-grid8).
 */
export default function LandingCarouselSlot({ children, grid = false }) {
  if (grid) {
    return (
      <div className="min-w-0">
        <div className="flex h-full w-full flex-col">{children}</div>
      </div>
    );
  }
  return (
    <div className="landing-carousel-card flex shrink-0 snap-start self-stretch">
      <div className="flex h-full w-full flex-col">{children}</div>
    </div>
  );
}
