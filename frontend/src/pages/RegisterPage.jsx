import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import { FiInfo } from "react-icons/fi";
import { register as registerRequest } from "../services/authService";
import useAuth from "../hooks/useAuth";
import { categories, cities } from "../utils/filterOptions";
import AuthBrandLogo from "../components/AuthBrandLogo";

const interestOptions = [
  "Events",
  "Deals",
  "Influencers",
  "Nightlife",
  "Food",
  "Tech",
  "Fashion",
  "Family Activities"
];

function FormField({ label, hint, example, className = "", children }) {
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

function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile_number: "",
    city_id: "",
    interests: [],
    wants_influencer: false,
    wants_deal: false,
    password: ""
  });
  const [influencerProfile, setInfluencerProfile] = useState({
    name: "",
    bio: "",
    category_id: "",
    contact_email: "",
    profile_image_url: ""
  });
  const [dealProfile, setDealProfile] = useState({
    name: "",
    business_email: "",
    business_mobile: "",
    location_text: "",
    category_id: "",
    bio: "",
    website_or_social_link: "",
    profile_image_url: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

  const eventCategories = useMemo(() => categories, []);
  const dealerLocationOptions = useMemo(
    () => [
      { value: "virtual", label: "Virtual / Online", cityId: null },
      ...cities.map((city) => ({ value: city.value, label: city.label, cityId: Number(city.value) }))
    ],
    []
  );

  useEffect(() => {
    if (!activeModal) {
      return undefined;
    }
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, [activeModal]);

  const toggleInterest = (value) => {
    setForm((s) => ({
      ...s,
      interests: s.interests.includes(value)
        ? s.interests.filter((item) => item !== value)
        : [...s.interests, value]
    }));
  };

  const renderInPortal = (node) => {
    if (typeof document === "undefined") {
      return node;
    }
    return createPortal(node, document.body);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      setLoading(true);
      const payload = {
        ...form,
        city_id: Number(form.city_id),
        influencer_profile: form.wants_influencer
          ? {
              ...influencerProfile,
              category_id: Number(influencerProfile.category_id)
            }
          : undefined,
        deal_profile: form.wants_deal
          ? {
              ...dealProfile,
              category_id: Number(dealProfile.category_id)
            }
          : undefined
      };
      const response = await registerRequest(payload);
      if (response?.data?.accessToken && response?.data?.user) {
        login(response.data);
      }
      navigate("/newsletter");
    } catch (err) {
      setError(err?.response?.data?.message || "Registration failed. Please review your details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-soft"
    >
      <div className="mb-4 flex justify-center">
        <AuthBrandLogo />
      </div>
      <h1 className="text-2xl font-bold">Create your account</h1>
      <p className="mt-1 text-sm text-slate-600">Tell us a bit about you so we can personalize your city experience.</p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
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
            onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
          />
          <input
            type="text"
            required
            placeholder="Mobile number"
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
                    active ? "bg-brand-600 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setForm((s) => ({ ...s, wants_influencer: !s.wants_influencer }));
              setActiveModal("influencer");
            }}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              form.wants_influencer
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Want to become an influencer? {form.wants_influencer ? "Yes" : "Tap to add profile"}
          </button>
          <button
            type="button"
            onClick={() => {
              setForm((s) => ({ ...s, wants_deal: !s.wants_deal }));
              setActiveModal("deal");
            }}
            className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
              form.wants_deal
                ? "border-brand-500 bg-brand-50 text-brand-700"
                : "border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Have hot deals to share? {form.wants_deal ? "Yes" : "Tap to add deal draft"}
          </button>
        </div>
        <input
          type="password"
          required
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
        />
        <button type="submit" className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white">
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
      <p className="mt-4 text-sm text-slate-600">
        Organizer and admin accounts are created only by authorized admins.
      </p>
      <p className="mt-2 text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-brand-600">
          Sign in
        </Link>
      </p>

      {renderInPortal(
      <AnimatePresence>
        {activeModal === "influencer" && form.wants_influencer ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 px-3 py-4 sm:px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex h-[min(76vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <h3 className="text-lg font-semibold">Influencer onboarding</h3>
              <p className="mb-4 text-sm text-slate-600">Complete this now and we will submit it with your registration.</p>
              <div className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-2">
                <FormField label="Profile Name" hint="Enter your public creator or brand name." example="Ava Luxe" className="sm:col-span-2">
                  <input
                    required={form.wants_influencer}
                    placeholder="Influencer name"
                    value={influencerProfile.name}
                    onChange={(e) => setInfluencerProfile((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Bio" hint="Write a short summary of your niche and audience." example="Fashion and lifestyle creator in New York." className="sm:col-span-2">
                  <textarea
                    rows={4}
                    required={form.wants_influencer}
                    placeholder="Bio"
                    value={influencerProfile.bio}
                    onChange={(e) => setInfluencerProfile((s) => ({ ...s, bio: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="City" hint="Choose your primary operating city.">
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
                <FormField label="Category" hint="Select the content category that fits your profile.">
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
                <FormField label="Contact Email" hint="Use an email where brands can contact you." example="creator@example.com">
                  <input
                    required={form.wants_influencer}
                    type="email"
                    placeholder="Contact email"
                    value={influencerProfile.contact_email}
                    onChange={(e) => setInfluencerProfile((s) => ({ ...s, contact_email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Profile Image URL" hint="Add a high-quality profile image link." example="https://images.example.com/profile.jpg">
                  <input
                    type="url"
                    placeholder="Profile image URL"
                    value={influencerProfile.profile_image_url}
                    onChange={(e) => setInfluencerProfile((s) => ({ ...s, profile_image_url: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
              </div>
              </div>
              <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setForm((s) => ({ ...s, wants_influencer: false }));
                    setActiveModal(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Save details
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      )}

      {renderInPortal(
      <AnimatePresence>
        {activeModal === "deal" && form.wants_deal ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 px-3 py-4 sm:px-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="flex h-[min(76vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
              <h3 className="text-lg font-semibold">Deal onboarding</h3>
              <p className="mb-4 text-sm text-slate-600">Create your dealer profile. Admin approval is required before posting deals.</p>
              <div className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-2">
                <FormField label="Business Name" hint="Enter your store or brand name." example="Glow City Deals" className="sm:col-span-2">
                  <input
                    required={form.wants_deal}
                    placeholder="Business name"
                    value={dealProfile.name}
                    onChange={(e) => setDealProfile((s) => ({ ...s, name: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Business Email" hint="Use your official business contact email." example="hello@glowcity.com">
                  <input
                    required={form.wants_deal}
                    type="email"
                    placeholder="Business email"
                    value={dealProfile.business_email}
                    onChange={(e) => setDealProfile((s) => ({ ...s, business_email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Business Mobile" hint="Primary WhatsApp/contact number for deal inquiries." example="+1 512 555 0199">
                  <input
                    required={form.wants_deal}
                    placeholder="Business mobile"
                    value={dealProfile.business_mobile}
                    onChange={(e) => setDealProfile((s) => ({ ...s, business_mobile: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Business Location" hint="Choose your city or Virtual / Online as business location.">
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
                <FormField label="Category" hint="Select the closest category for your business offerings.">
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
                <FormField label="About / Bio" hint="Add a short summary of your business and what you offer." example="Curating premium beauty and wellness offers in NYC." className="sm:col-span-2">
                  <textarea
                    rows={4}
                    required={form.wants_deal}
                    placeholder="About / bio"
                    value={dealProfile.bio}
                    onChange={(e) => setDealProfile((s) => ({ ...s, bio: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Website / Social Link" hint="Add your business website or social page URL." example="https://instagram.com/glowcitydeals">
                  <input
                    placeholder="Website / social link"
                    value={dealProfile.website_or_social_link}
                    onChange={(e) => setDealProfile((s) => ({ ...s, website_or_social_link: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
                <FormField label="Profile Image / Logo URL" hint="Paste a public logo or profile image URL." example="https://images.example.com/logo.png">
                  <input
                    placeholder="Profile image / logo URL"
                    value={dealProfile.profile_image_url}
                    onChange={(e) => setDealProfile((s) => ({ ...s, profile_image_url: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </FormField>
              </div>
              </div>
              <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setForm((s) => ({ ...s, wants_deal: false }));
                    setActiveModal(null);
                  }}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Save details
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      )}
    </motion.div>
  );
}

export default RegisterPage;
