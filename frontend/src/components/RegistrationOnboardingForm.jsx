import { useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiInfo } from "react-icons/fi";
import { categories } from "../utils/filterOptions";
import useCityFilter from "../hooks/useCityFilter";
import CloudinaryImageInput from "./CloudinaryImageInput";

export const interestOptions = [
  "Events",
  "Deals",
  "Influencers",
  "Nightlife",
  "Food",
  "Tech",
  "Fashion",
  "Family Activities"
];

export function FormField({ label, hint, example, className = "", children }) {
  return (
    <div className={`block ${className}`}>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
      <span className="mb-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
        <FiInfo className="text-slate-400" />
        {hint}
        {example ? <span className="text-slate-400">Example: {example}</span> : null}
      </span>
      {children}
    </div>
  );
}

function ExpandPanel({ open, children }) {
  return (
    <AnimatePresence initial={false}>
      {open ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
          className="overflow-hidden"
        >
          <div className="border-t border-brand-200/60 bg-gradient-to-b from-brand-50/50 to-white px-3 pb-4 pt-3 sm:px-4">
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/**
 * Shared onboarding: names, email, optional mobile, city, interests,
 * influencer / deal optional sections with checkbox + inline expandable details.
 */
export default function RegistrationOnboardingForm({ form, setForm, influencerProfile, setInfluencerProfile, dealProfile, setDealProfile, emailMode = "editable" }) {
  const { cities } = useCityFilter();
  const eventCategories = useMemo(() => categories, []);
  const dealerLocationOptions = useMemo(
    () => [
      { value: "virtual", label: "Virtual / Online", cityId: null },
      ...cities.map((city) => ({ value: city.value, label: city.label, cityId: Number(city.value) }))
    ],
    [cities]
  );

  const toggleInterest = (value) => {
    setForm((s) => ({
      ...s,
      interests: s.interests.includes(value) ? s.interests.filter((item) => item !== value) : [...s.interests, value]
    }));
  };

  const emailReadOnly = emailMode === "readonly";

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="text"
          required
          placeholder="First name"
          value={form.first_name}
          onChange={(e) => setForm((s) => ({ ...s, first_name: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
        />
        <input
          type="text"
          required
          placeholder="Last name"
          value={form.last_name}
          onChange={(e) => setForm((s) => ({ ...s, last_name: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={emailReadOnly ? undefined : (e) => setForm((s) => ({ ...s, email: e.target.value }))}
          readOnly={emailReadOnly}
          className={`w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none ${
            emailReadOnly ? "cursor-not-allowed bg-slate-50 text-slate-600" : ""
          }`}
        />
        <input
          type="text"
          placeholder="Mobile (optional)"
          value={form.mobile_number}
          onChange={(e) => setForm((s) => ({ ...s, mobile_number: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
        />
      </div>
      <select
        required
        value={form.city_id}
        onChange={(e) => setForm((s) => ({ ...s, city_id: e.target.value }))}
        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
      >
        <option value="">Select city you live in</option>
        {cities.map((city) => (
          <option key={city.value} value={city.value}>
            {city.label}
          </option>
        ))}
      </select>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-sm font-semibold text-slate-800">Interested in (multiple)</p>
        <div className="flex flex-wrap gap-2">
          {interestOptions.map((option) => {
            const active = form.interests.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleInterest(option)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  active ? "bg-brand-600 text-white shadow-sm" : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-100"
                }`}
              >
                {option}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-3">
        <div
          className={`overflow-hidden rounded-2xl border transition-shadow ${
            form.wants_influencer ? "border-brand-400/60 shadow-[0_0_0_1px_rgba(217,70,239,0.12)]" : "border-slate-200"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50/80">
            <input
              type="checkbox"
              checked={form.wants_influencer}
              onChange={(e) => setForm((s) => ({ ...s, wants_influencer: e.target.checked }))}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Are you an influencer?</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Check this to add your creator profile — we&apos;ll review it after you register.
              </span>
            </span>
          </label>
          <ExpandPanel open={form.wants_influencer}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField
                label="Profile Name"
                hint="Your public creator or brand name."
                example="Ava Luxe"
                className="sm:col-span-2"
              >
                <input
                  required={form.wants_influencer}
                  placeholder="Influencer name"
                  value={influencerProfile.name}
                  onChange={(e) => setInfluencerProfile((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField
                label="Bio"
                hint="Short summary of your niche and audience."
                example="Fashion and lifestyle in New York."
                className="sm:col-span-2"
              >
                <textarea
                  rows={3}
                  required={form.wants_influencer}
                  placeholder="Bio"
                  value={influencerProfile.bio}
                  onChange={(e) => setInfluencerProfile((s) => ({ ...s, bio: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="City" hint="Primary operating city.">
                <select
                  required={form.wants_influencer}
                  value={form.city_id}
                  onChange={(e) => setForm((s) => ({ ...s, city_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select city</option>
                  {cities.map((city) => (
                    <option key={city.value} value={city.value}>
                      {city.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category" hint="Content category.">
                <select
                  required={form.wants_influencer}
                  value={influencerProfile.category_id}
                  onChange={(e) => setInfluencerProfile((s) => ({ ...s, category_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select category</option>
                  {eventCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Contact Email" hint="Where brands can reach you." example="creator@example.com">
                <input
                  required={form.wants_influencer}
                  type="email"
                  placeholder="Contact email"
                  value={influencerProfile.contact_email}
                  onChange={(e) => setInfluencerProfile((s) => ({ ...s, contact_email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Profile image" hint="Upload a public-facing profile photo.">
                <CloudinaryImageInput
                  value={influencerProfile.profile_image_url}
                  onChange={(url) => setInfluencerProfile((s) => ({ ...s, profile_image_url: url }))}
                />
              </FormField>
            </div>
          </ExpandPanel>
        </div>

        <div
          className={`overflow-hidden rounded-2xl border transition-shadow ${
            form.wants_deal ? "border-emerald-400/60 shadow-[0_0_0_1px_rgba(16,185,129,0.12)]" : "border-slate-200"
          }`}
        >
          <label className="flex cursor-pointer items-start gap-3 px-4 py-3.5 transition hover:bg-slate-50/80">
            <input
              type="checkbox"
              checked={form.wants_deal}
              onChange={(e) => setForm((s) => ({ ...s, wants_deal: e.target.checked }))}
              className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            />
            <span>
              <span className="block text-sm font-semibold text-slate-900">Have a hot deal to share?</span>
              <span className="mt-0.5 block text-xs text-slate-600">
                Add a draft dealer profile — admin approval is required before posting deals.
              </span>
            </span>
          </label>
          <ExpandPanel open={form.wants_deal}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <FormField label="Business Name" hint="Store or brand name." example="Glow City Deals" className="sm:col-span-2">
                <input
                  required={form.wants_deal}
                  placeholder="Business name"
                  value={dealProfile.name}
                  onChange={(e) => setDealProfile((s) => ({ ...s, name: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Business Email" hint="Official contact email." example="hello@…">
                <input
                  required={form.wants_deal}
                  type="email"
                  placeholder="Business email"
                  value={dealProfile.business_email}
                  onChange={(e) => setDealProfile((s) => ({ ...s, business_email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Business Mobile" hint="WhatsApp or phone for inquiries." example="+1 512 555 0199">
                <input
                  required={form.wants_deal}
                  placeholder="Business mobile"
                  value={dealProfile.business_mobile}
                  onChange={(e) => setDealProfile((s) => ({ ...s, business_mobile: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Business Location" hint="City or Virtual / Online.">
                <select
                  required={form.wants_deal}
                  value={dealerLocationOptions.find((opt) => opt.label === dealProfile.location_text)?.value || ""}
                  onChange={(e) => {
                    const option = dealerLocationOptions.find((opt) => String(opt.value) === String(e.target.value));
                    if (!option) {
                      return;
                    }
                    setDealProfile((s) => ({ ...s, location_text: option.label }));
                    if (option.cityId) {
                      setForm((s) => ({ ...s, city_id: String(option.cityId) }));
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select location</option>
                  {dealerLocationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Category" hint="Closest match for your offers.">
                <select
                  required={form.wants_deal}
                  value={dealProfile.category_id}
                  onChange={(e) => setDealProfile((s) => ({ ...s, category_id: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                >
                  <option value="">Select category</option>
                  {eventCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField
                label="About / Bio"
                hint="What you offer."
                example="Premium beauty offers in NYC."
                className="sm:col-span-2"
              >
                <textarea
                  rows={3}
                  required={form.wants_deal}
                  placeholder="About / bio"
                  value={dealProfile.bio}
                  onChange={(e) => setDealProfile((s) => ({ ...s, bio: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Website / Social" hint="Public URL." example="https://instagram.com/…" className="sm:col-span-2">
                <input
                  placeholder="Website / social link"
                  value={dealProfile.website_or_social_link}
                  onChange={(e) => setDealProfile((s) => ({ ...s, website_or_social_link: e.target.value }))}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </FormField>
              <FormField label="Logo / profile image" hint="Optional image for your business profile." className="sm:col-span-2">
                <CloudinaryImageInput
                  value={dealProfile.profile_image_url}
                  onChange={(url) => setDealProfile((s) => ({ ...s, profile_image_url: url }))}
                />
              </FormField>
            </div>
          </ExpandPanel>
        </div>
      </div>
    </>
  );
}
