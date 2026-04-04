import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { fetchFeaturedEvents } from "../services/eventService";
import { fetchDeals, fetchInfluencers } from "../services/listingService";

const ROTATE_MS = 5200;

const FALLBACK_POOL = [
  {
    id: "fb-1",
    type: "event",
    typeLabel: "Events",
    title: "Concerts & nights out",
    image: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200&q=80",
    href: "/events"
  },
  {
    id: "fb-2",
    type: "deal",
    typeLabel: "Deals",
    title: "Exclusive offers",
    image: "https://images.unsplash.com/photo-1556742049-887f6717d7e4?w=1200&q=80",
    href: "/deals"
  },
  {
    id: "fb-3",
    type: "influencer",
    typeLabel: "Creators",
    title: "Local voices",
    image: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=1200&q=80",
    href: "/influencers"
  },
  {
    id: "fb-4",
    type: "event",
    typeLabel: "Events",
    title: "Festivals & culture",
    image: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa88?w=1200&q=80",
    href: "/events"
  },
  {
    id: "fb-5",
    type: "deal",
    typeLabel: "Deals",
    title: "Save on dining",
    image: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80",
    href: "/deals"
  },
  {
    id: "fb-6",
    type: "influencer",
    typeLabel: "Creators",
    title: "Trending profiles",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1200&q=80",
    href: "/influencers"
  }
];

function shuffleInPlace(arr) {
  const a = arr;
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function typeBadgeClass(type) {
  if (type === "deal") {
    return "bg-emerald-500/90 text-white";
  }
  if (type === "influencer") {
    return "bg-violet-500/90 text-white";
  }
  return "bg-brand-600/90 text-white";
}

function buildPoolFromApi(eventRows, dealRows, inflRows) {
  const out = [];
  const seenImg = new Set();

  const push = (entry) => {
    const img = String(entry.image || "").trim();
    if (!img || seenImg.has(img)) {
      return;
    }
    seenImg.add(img);
    out.push(entry);
  };

  (eventRows || []).forEach((row) => {
    const img = row.image_url || row.image;
    if (!row?.id || !img) {
      return;
    }
    push({
      id: `e-${row.id}`,
      type: "event",
      typeLabel: "Event",
      title: row.title || "Event",
      image: img,
      href: `/events/${row.id}`
    });
  });

  (dealRows || []).forEach((row) => {
    const img = row.image_url || row.image;
    if (!row?.id || !img) {
      return;
    }
    push({
      id: `d-${row.id}`,
      type: "deal",
      typeLabel: "Deal",
      title: row.title || "Deal",
      image: img,
      href: `/deals/${row.id}`
    });
  });

  (inflRows || []).forEach((row) => {
    const img = row.profile_image_url || row.image_url || row.image;
    if (!row?.id || !img) {
      return;
    }
    push({
      id: `i-${row.id}`,
      type: "influencer",
      typeLabel: "Creator",
      title: row.name || row.display_name || "Creator",
      image: img,
      href: `/influencers/${row.id}`
    });
  });

  if (out.length < 3) {
    return [];
  }
  return shuffleInPlace(out);
}

/** Bento layout only at `lg:` (1024px+) so tablet uses the simpler 2-column stack. */
const TILES = [
  {
    key: "hero",
    className: "col-span-2 row-span-2 min-h-[140px] sm:min-h-[180px] lg:col-span-7 lg:row-span-4 lg:min-h-0",
    offset: 0,
    round: "rounded-3xl"
  },
  {
    key: "t1",
    className: "col-span-1 row-span-1 min-h-[68px] lg:col-span-5 lg:row-span-2 lg:min-h-0",
    offset: 1,
    round: "rounded-2xl"
  },
  {
    key: "t2",
    className: "col-span-1 row-span-1 min-h-[68px] lg:col-span-5 lg:row-span-2 lg:min-h-0",
    offset: 2,
    round: "rounded-2xl"
  },
  {
    key: "t3",
    className: "col-span-1 row-span-1 min-h-[68px] lg:col-span-4 lg:row-span-2 lg:min-h-0",
    offset: 3,
    round: "rounded-2xl"
  },
  {
    key: "t4",
    className: "col-span-1 row-span-1 min-h-[68px] lg:col-span-4 lg:row-span-2 lg:min-h-0",
    offset: 4,
    round: "rounded-2xl"
  },
  {
    key: "t5",
    className: "col-span-2 row-span-1 min-h-[72px] lg:col-span-4 lg:row-span-2 lg:min-h-0",
    offset: 5,
    round: "rounded-2xl"
  }
];

/** Decorative only on the login page — no links, no pointer interaction. */
function GalleryTile({ entry, reduceMotion, large, roundClass }) {
  if (!entry) {
    return null;
  }

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-slate-800 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.55)] ring-1 ring-white/10 ${roundClass} pointer-events-none select-none`}
      role="presentation"
    >
      <div className="relative block h-full min-h-[5.5rem] w-full lg:min-h-0" aria-hidden>
        <div className="absolute inset-0 overflow-hidden">
          <AnimatePresence initial={false}>
            <motion.img
              key={entry.id}
              src={entry.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover"
              initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.08 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
              transition={{ duration: reduceMotion ? 0.2 : 0.55, ease: [0.25, 0.1, 0.25, 1] }}
            />
          </AnimatePresence>
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/10 to-slate-950/25 opacity-90"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-400 via-transparent to-cyan-300 opacity-0 mix-blend-overlay"
            aria-hidden
          />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 sm:p-3">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide shadow-sm sm:text-[11px] ${typeBadgeClass(
              entry.type
            )}`}
          >
            {entry.typeLabel}
          </span>
          <p className={`mt-1.5 line-clamp-2 font-semibold text-white drop-shadow-md ${large ? "text-sm sm:text-base" : "text-xs sm:text-sm"}`}>
            {entry.title}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginDiscoverGallery() {
  const reduceMotion = useReducedMotion();
  const [pool, setPool] = useState([]);
  const [spotlight, setSpotlight] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [evRes, dealRes, inflRes] = await Promise.all([
          fetchFeaturedEvents({ limit: 16 }),
          fetchDeals({ sort: "popularity", only_active: "true" }),
          fetchInfluencers({ sort: "popularity" })
        ]);
        if (cancelled) {
          return;
        }
        const built = buildPoolFromApi(evRes?.data || [], dealRes?.data || [], inflRes?.data || []);
        setPool(built.length ? built : [...FALLBACK_POOL]);
      } catch (_e) {
        if (!cancelled) {
          setPool([...FALLBACK_POOL]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || pool.length < 2) {
      return undefined;
    }
    const id = window.setInterval(() => {
      setSpotlight((s) => (s + 1) % pool.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [pool.length, reduceMotion]);

  const tilesWithEntries = useMemo(() => {
    const len = pool.length || 1;
    return TILES.map((t) => ({
      ...t,
      entry: pool[(spotlight + t.offset) % len] || pool[0]
    }));
  }, [pool, spotlight]);

  return (
    <div
      data-route-splash-ignore
      className="relative flex h-full min-h-[min(58vh,420px)] w-full min-w-0 flex-col overflow-hidden bg-slate-950 shadow-[0_28px_64px_-28px_rgba(15,23,42,0.35)] ring-1 ring-slate-900/20 sm:min-h-[min(60vh,460px)] lg:rounded-3xl lg:min-h-0 lg:h-full"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_70%_20%,rgba(244,114,182,0.12),transparent_55%),radial-gradient(ellipse_80%_60%_at_10%_80%,rgba(56,189,248,0.1),transparent_50%)]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:24px_24px]" aria-hidden />

      {loading ? (
        <div className="flex h-full min-h-[260px] flex-col justify-center gap-3 p-6 lg:min-h-[420px]" aria-hidden>
          <div className="mx-auto h-3 w-3/5 max-w-xs animate-pulse rounded-full bg-white/10" />
          <div className="grid flex-1 grid-cols-2 gap-2 lg:grid-cols-12 lg:grid-rows-6">
            <div className="col-span-2 row-span-2 animate-pulse rounded-3xl bg-white/10 lg:col-span-7 lg:row-span-4" />
            <div className="hidden animate-pulse rounded-2xl bg-white/10 lg:col-span-5 lg:row-span-2 lg:block" />
            <div className="hidden animate-pulse rounded-2xl bg-white/10 lg:col-span-5 lg:row-span-2 lg:block" />
            <div className="col-span-1 animate-pulse rounded-2xl bg-white/10 lg:col-span-4 lg:row-span-2" />
            <div className="col-span-1 animate-pulse rounded-2xl bg-white/10 lg:col-span-4 lg:row-span-2" />
          </div>
        </div>
      ) : (
        <div className="relative z-[1] flex min-h-0 flex-1 flex-col pointer-events-none">
          <p className="pointer-events-none absolute bottom-2 left-3 right-3 z-[2] text-center text-[11px] font-medium leading-snug text-white/80 sm:left-4 sm:right-4 sm:text-sm lg:bottom-auto lg:left-5 lg:right-auto lg:top-5 lg:max-w-none lg:text-left lg:text-sm">
            Discover events, deals &amp; creators near you.
          </p>
          <div className="relative min-h-0 flex-1 px-2 pb-2 pt-2 sm:px-3 sm:pb-3 lg:p-4 lg:pb-4 lg:pt-14">
            <div className="grid h-full min-h-[260px] auto-rows-fr grid-cols-2 grid-rows-[2fr_1fr_1fr_1fr_1fr] gap-2 sm:min-h-[300px] sm:gap-2.5 lg:min-h-0 lg:grid-cols-12 lg:grid-rows-6 lg:gap-3">
              {tilesWithEntries.map((tile) => (
                <div key={tile.key} className={`relative min-h-0 ${tile.className}`}>
                  <GalleryTile
                    entry={tile.entry}
                    reduceMotion={reduceMotion}
                    large={tile.key === "hero"}
                    roundClass={tile.round}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
