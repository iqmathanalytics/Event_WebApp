import { useEffect, useState } from "react";
import { FiLock, FiYoutube } from "react-icons/fi";
import { youtubeEmbedUrl } from "../utils/youtubeVideo";

/**
 * One promo-video slide inside the event hero carousel.
 * Click play to embed YouTube inline; guests see a locked thumbnail.
 */
export default function EventDetailBannerVideoSlide({
  watchUrl,
  embedUrl,
  thumbnail,
  title,
  slideIndex,
  active = false,
  guestLocked = false,
  onPlayStart,
  onPlayStop
}) {
  const [playing, setPlaying] = useState(false);
  const label = `Promo video ${slideIndex + 1}`;
  const inlineEmbedUrl = playing ? youtubeEmbedUrl(watchUrl, { autoplay: true }) : embedUrl;

  useEffect(() => {
    if (!active) {
      setPlaying((wasPlaying) => {
        if (wasPlaying) {
          onPlayStop?.();
        }
        return false;
      });
    }
  }, [active, onPlayStop]);

  const handlePlay = () => {
    if (guestLocked || playing) {
      return;
    }
    setPlaying(true);
    onPlayStart?.();
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-950">
      <img
        src={thumbnail}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover opacity-40 blur-sm scale-110"
        loading="lazy"
        decoding="async"
      />
      <img
        src={thumbnail}
        alt={label}
        className="relative z-[1] mx-auto h-full w-full max-w-full object-contain"
        loading={active ? "eager" : "lazy"}
        decoding="async"
      />

      {guestLocked ? (
        <div className="absolute inset-0 z-[2] flex flex-col items-center justify-center gap-3 bg-slate-950/55 px-4 text-center backdrop-blur-[2px]">
          <span className="grid h-14 w-14 place-content-center rounded-2xl bg-white/10 ring-1 ring-white/25">
            <FiLock className="h-6 w-6 text-white" aria-hidden />
          </span>
          <p className="max-w-xs text-sm font-semibold text-white">Login to watch promo video</p>
        </div>
      ) : playing ? (
        <iframe
          title={`${title} — ${label}`}
          src={inlineEmbedUrl}
          className="absolute inset-0 z-[30] h-full w-full border-0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={handlePlay}
          disabled={!active}
          className="group absolute inset-0 z-[2] flex items-center justify-center border-0 bg-slate-950/25 p-0 transition hover:bg-slate-950/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70 disabled:cursor-default disabled:hover:bg-slate-950/25"
          aria-label={`Play ${label}`}
        >
          <span className="grid h-16 w-16 place-content-center rounded-full bg-red-600/90 text-white shadow-lg ring-4 ring-white/20 transition group-hover:scale-105 group-disabled:scale-100">
            <FiYoutube className="h-8 w-8" aria-hidden />
          </span>
        </button>
      )}

      {!playing ? (
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-[3] bg-gradient-to-t from-slate-950/85 to-transparent px-3 pb-3 pt-10 sm:px-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">Promo video</p>
        </div>
      ) : null}
    </div>
  );
}
