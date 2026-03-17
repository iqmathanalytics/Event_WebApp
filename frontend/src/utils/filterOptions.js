const byLabelAsc = (a, b) => a.label.localeCompare(b.label, "en", { sensitivity: "base" });

export const cities = [
  { value: "1", label: "New York" },
  { value: "2", label: "Los Angeles" },
  { value: "3", label: "Miami" },
  { value: "4", label: "Chicago" },
  { value: "5", label: "Austin" },
  { value: "6", label: "San Francisco" },
  { value: "7", label: "San Diego" },
  { value: "8", label: "Seattle" },
  { value: "9", label: "Boston" },
  { value: "10", label: "Dallas" },
  { value: "11", label: "Houston" },
  { value: "12", label: "Las Vegas" },
  { value: "13", label: "Denver" },
  { value: "14", label: "Atlanta" },
  { value: "15", label: "Orlando" },
  { value: "16", label: "Washington DC" },
  { value: "17", label: "Phoenix" },
  { value: "18", label: "Nashville" },
  { value: "19", label: "San Jose" },
  { value: "20", label: "Portland" }
].sort(byLabelAsc);

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
