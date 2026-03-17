const byLabelAsc = (a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" });

export const categories = [
  { value: "1", label: "Music" },
  { value: "2", label: "Nightlife" },
  { value: "3", label: "Fashion" },
  { value: "4", label: "Food & Drinks" },
  { value: "5", label: "Beauty & Services" },
  { value: "6", label: "Comedy" },
  { value: "7", label: "Technology" },
  { value: "8", label: "Startup / Networking" },
  { value: "9", label: "Business / Conference" },
  { value: "10", label: "Health & Wellness" },
  { value: "11", label: "Fitness" },
  { value: "12", label: "Art & Culture" },
  { value: "13", label: "Festival" },
  { value: "14", label: "Workshops" },
  { value: "15", label: "Education" },
  { value: "16", label: "Family Events" },
  { value: "17", label: "Outdoor Events" },
  { value: "18", label: "Sports" },
  { value: "19", label: "Influencer Meetups" },
  { value: "20", label: "Community Events" }
].sort(byLabelAsc);

export const sortOptions = [
  { value: "popularity", label: "Popularity" },
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price", label: "Price" }
].sort(byLabelAsc);
