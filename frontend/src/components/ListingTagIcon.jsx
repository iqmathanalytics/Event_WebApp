import { Award, Crown, Flame, Gem, Sparkles, Sprout, Star, TrendingUp } from "lucide-react";

const TAG_MARKS = {
  "Hot Selling": {
    Icon: Flame,
    motion: "listing-tag-icon--flame",
    shell: "bg-rose-50 text-rose-600 ring-rose-200"
  },
  Trending: {
    Icon: TrendingUp,
    motion: "listing-tag-icon--trend",
    shell: "bg-indigo-50 text-indigo-600 ring-indigo-200"
  },
  "One of a Kind": {
    Icon: Gem,
    motion: "listing-tag-icon--gem",
    shell: "bg-amber-50 text-amber-600 ring-amber-200"
  },
  "Recently Added": {
    Icon: Sparkles,
    motion: "listing-tag-icon--spark",
    shell: "bg-emerald-50 text-emerald-600 ring-emerald-200"
  },
  Popular: {
    Icon: Star,
    motion: "listing-tag-icon--star",
    shell: "bg-fuchsia-50 text-fuchsia-600 ring-fuchsia-200"
  },
  Rising: {
    Icon: Sprout,
    motion: "listing-tag-icon--rise",
    shell: "bg-emerald-50 text-emerald-700 ring-emerald-200"
  },
  "Top Creator": {
    Icon: Crown,
    motion: "listing-tag-icon--crown",
    shell: "bg-brand-50 text-brand-700 ring-brand-200"
  }
};

const FALLBACK_MARK = {
  Icon: Award,
  motion: "listing-tag-icon--spark",
  shell: "bg-slate-50 text-slate-600 ring-slate-200"
};

export default function ListingTagIcon({ tag }) {
  const mark = TAG_MARKS[tag] || FALLBACK_MARK;
  const Icon = mark.Icon;

  return (
    <span
      className={`listing-tag-icon inline-flex h-10 w-10 items-center justify-center rounded-2xl ring-1 shadow-sm ${mark.shell}`}
      role="img"
      aria-label={tag}
      title={tag}
    >
      <Icon className={`listing-tag-icon__glyph h-[18px] w-[18px] ${mark.motion}`} strokeWidth={2.25} aria-hidden />
    </span>
  );
}

export function LandingTagList({
  tags,
  classFor,
  mobileClassName = "flex flex-wrap items-center gap-2 lg:hidden",
  desktopClassName = "hidden flex-wrap items-center gap-1.5 lg:flex"
}) {
  if (!Array.isArray(tags) || tags.length === 0) {
    return null;
  }

  return (
    <>
      <div className={mobileClassName}>
        {tags.map((tag) => (
          <ListingTagIcon key={tag} tag={tag} />
        ))}
      </div>
      <div className={desktopClassName}>
        {tags.map((tag) => (
          <span key={tag} className={classFor(tag)}>
            {tag}
          </span>
        ))}
      </div>
    </>
  );
}
