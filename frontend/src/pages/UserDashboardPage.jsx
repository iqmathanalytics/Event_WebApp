import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FiEdit2, FiInfo, FiKey, FiUser } from "react-icons/fi";
import useFavorites from "../hooks/useFavorites";
import useAuth from "../hooks/useAuth";
import { fetchMyBookings } from "../services/bookingService";
import {
  fetchMyDealSubmissions,
  fetchMyInfluencerSubmissions
} from "../services/listingService";
import { formatCurrency, formatDateUS } from "../utils/format";
import { refreshAccessToken } from "../services/authService";
import { changeMyPassword, enableOrganizer, fetchMyProfile, updateMyProfile } from "../services/userService";
import { categories, cities } from "../utils/filterOptions";

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
const profileTabs = [
  { key: "basic", label: "Basic" },
  { key: "preferences", label: "Preferences" },
  { key: "creator", label: "Creator Info" }
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

function getDisplayPrice(item) {
  if (item.listing_type === "event") {
    return item.event_price;
  }
  if (item.listing_type === "deal") {
    return item.deal_price;
  }
  if (item.listing_type === "service") {
    return item.service_price;
  }
  return null;
}

function formatReadableDate(value) {
  if (!value) {
    return "Date not available";
  }
  return formatDateUS(value);
}

function getLocationUrl(booking) {
  if (booking.google_maps_link) {
    return booking.google_maps_link;
  }
  if (booking.venue_address || booking.venue_name) {
    const query = booking.venue_address || booking.venue_name;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }
  return null;
}

function parseInfluencerSocialLinks(value) {
  if (!value) {
    return { instagram: "", youtube: "" };
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return {
      instagram: String(value.instagram || "").trim(),
      youtube: String(value.youtube || "").trim()
    };
  }
  try {
    const parsed = JSON.parse(value);
    return {
      instagram: String(parsed?.instagram || "").trim(),
      youtube: String(parsed?.youtube || "").trim()
    };
  } catch (_err) {
    return { instagram: "", youtube: "" };
  }
}

function getFavoriteDetailsUrl(item) {
  if (!item) return null;
  const listingType = item.listing_type;
  const listingId = item.listing_id;
  if (!listingType || listingId == null) return null;

  if (listingType === "event") return `/events/${listingId}`;
  if (listingType === "deal") return `/deals/${listingId}`;
  if (listingType === "influencer") return `/influencers/${listingId}`;
  return null;
}

function UserDashboardPage() {
  const { user, accessToken, refreshToken, login } = useAuth();
  const { favorites, loading, toggleFavorite } = useFavorites();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingFilter, setBookingFilter] = useState("upcoming");
  const [enablingOrganizer, setEnablingOrganizer] = useState(false);
  const [organizerEnableError, setOrganizerEnableError] = useState("");
  const [myInfluencerSubmissions, setMyInfluencerSubmissions] = useState([]);
  const [myDealSubmissions, setMyDealSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [profile, setProfile] = useState(user || null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [activeCreatorModal, setActiveCreatorModal] = useState(null);
  const [profileEditorTab, setProfileEditorTab] = useState("basic");
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: user?.email || "",
    mobile_number: user?.mobile_number || "",
    city_id: "",
    interests: [],
    wants_influencer: false,
    wants_deal: false
  });
  const [influencerProfile, setInfluencerProfile] = useState({
    name: "",
    bio: "",
    category_id: "",
    instagram: "",
    youtube: "",
    followers_count: "",
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: ""
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const canOrganize = Number(user?.organizer_enabled) === 1;
  const profileInitial = String(profile?.name || user?.name || "U").trim().charAt(0).toUpperCase();
  const currentTabIndex = Math.max(
    0,
    profileTabs.findIndex((tab) => tab.key === profileEditorTab)
  );
  const progressPercent = Math.round(((currentTabIndex + 1) / profileTabs.length) * 100);
  const dealerStatus = profile?.dealer_profile?.status || null;
  const influencerStatus = myInfluencerSubmissions[0]?.status || null;
  const isInfluencerPending = String(influencerStatus || "").toLowerCase() === "pending";
  const isDealerPending = String(dealerStatus || "").toLowerCase() === "pending";
  const hasInfluencerDetails = Boolean(
    influencerProfile.name?.trim() &&
      influencerProfile.bio?.trim() &&
      influencerProfile.category_id &&
      profileForm.city_id &&
      influencerProfile.followers_count !== undefined &&
      String(influencerProfile.followers_count).trim() !== "" &&
      influencerProfile.contact_email?.trim()
  );
  const hasDealerDetails = Boolean(
    dealProfile.name?.trim() &&
      dealProfile.business_email?.trim() &&
      dealProfile.business_mobile?.trim() &&
      dealProfile.location_text?.trim() &&
      dealProfile.category_id &&
      dealProfile.bio?.trim()
  );
  const dealerLocationOptions = useMemo(
    () => [
      { value: "virtual", label: "Virtual / Online", cityId: null },
      ...cities.map((city) => ({ value: city.value, label: city.label, cityId: Number(city.value) }))
    ],
    []
  );

  const isGoogleUser = useMemo(
    () => String(profile?.auth_provider || user?.auth_provider || "").toLowerCase() === "google",
    [profile?.auth_provider, user?.auth_provider]
  );
  /** Google: no local password yet — “Set” copy; otherwise still no current-password field */
  const isGoogleFirstPassword = isGoogleUser && profile?.has_local_password !== true;

  useEffect(() => {
    setProfile(user || null);
    const onboarding = user?.onboarding || {};
    const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
    setProfileForm({
      first_name: onboarding.first_name || parts.slice(0, -1).join(" ") || parts[0] || "",
      last_name: onboarding.last_name || (parts.length > 1 ? parts[parts.length - 1] : ""),
      email: user?.email || "",
      mobile_number: onboarding.mobile_number || user?.mobile_number || "",
      city_id: onboarding.city_id ? String(onboarding.city_id) : "",
      interests: Array.isArray(onboarding.interests) ? onboarding.interests : [],
      wants_influencer: Boolean(onboarding.wants_influencer),
      wants_deal: Boolean(onboarding.wants_deal)
    });
  }, [user]);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      try {
        const response = await fetchMyProfile();
        if (active && response?.data) {
          setProfile(response.data);
          const onboarding = response.data.onboarding || {};
          const parts = String(response.data.name || "").trim().split(/\s+/).filter(Boolean);
          setProfileForm({
            first_name: onboarding.first_name || parts.slice(0, -1).join(" ") || parts[0] || "",
            last_name: onboarding.last_name || (parts.length > 1 ? parts[parts.length - 1] : ""),
            email: response.data.email || "",
            mobile_number: onboarding.mobile_number || response.data.mobile_number || "",
            city_id: onboarding.city_id ? String(onboarding.city_id) : "",
            interests: Array.isArray(onboarding.interests) ? onboarding.interests : [],
            wants_influencer: Boolean(onboarding.wants_influencer),
            wants_deal: Boolean(onboarding.wants_deal)
          });
        }
      } catch (_err) {
        // keep auth snapshot
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!myInfluencerSubmissions.length) {
      return;
    }
    const item = myInfluencerSubmissions[0];
    const links = parseInfluencerSocialLinks(item.social_links);
    setInfluencerProfile((prev) => ({
      ...prev,
      name: item.name || prev.name,
      bio: item.bio || prev.bio,
      category_id: item.category_id ? String(item.category_id) : prev.category_id,
      instagram: links.instagram || prev.instagram,
      youtube: links.youtube || prev.youtube,
      followers_count: item.followers_count != null ? String(item.followers_count) : prev.followers_count,
      contact_email: item.contact_email || prev.contact_email,
      profile_image_url: item.profile_image_url || prev.profile_image_url
    }));
  }, [myInfluencerSubmissions]);

  useEffect(() => {
    if (profile?.dealer_profile) {
      const item = profile.dealer_profile;
      setDealProfile((prev) => ({
        ...prev,
        name: item.name || prev.name,
        business_email: item.business_email || prev.business_email,
        business_mobile: item.business_mobile || prev.business_mobile,
        location_text: item.location_text || prev.location_text,
        category_id: item.category_id ? String(item.category_id) : prev.category_id,
        bio: item.bio || prev.bio,
        website_or_social_link: item.website_or_social_link || prev.website_or_social_link,
        profile_image_url: item.profile_image_url || prev.profile_image_url
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (!showProfileEditor && !showPasswordModal) {
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
  }, [showProfileEditor, showPasswordModal]);

  const renderInPortal = (node) => {
    if (typeof document === "undefined") {
      return node;
    }
    return createPortal(node, document.body);
  };

  useEffect(() => {
    let active = true;
    async function loadBookings() {
      try {
        setLoadingBookings(true);
        setBookingsError("");
        const response = await fetchMyBookings();
        if (active) {
          setBookings(response?.data || []);
        }
      } catch (_err) {
        if (active) {
          setBookings([]);
          setBookingsError("Could not load your bookings right now.");
        }
      } finally {
        if (active) {
          setLoadingBookings(false);
        }
      }
    }

    loadBookings();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadSubmissions() {
      try {
        setLoadingSubmissions(true);
        setSubmissionsError("");
        const [influencerResult, dealResult] = await Promise.allSettled([
          fetchMyInfluencerSubmissions(),
          fetchMyDealSubmissions()
        ]);
        if (active) {
          const influencerRows =
            influencerResult.status === "fulfilled" ? influencerResult.value?.data || [] : [];
          const dealRows = dealResult.status === "fulfilled" ? dealResult.value?.data || [] : [];
          setMyInfluencerSubmissions(influencerRows);
          setMyDealSubmissions(dealRows);
          if (influencerResult.status === "rejected" && dealResult.status === "rejected") {
            setSubmissionsError("Could not load your submissions right now.");
          }
        }
      } catch (_err) {
        if (active) {
          setMyInfluencerSubmissions([]);
          setMyDealSubmissions([]);
          setSubmissionsError("Could not load your submissions right now.");
        }
      } finally {
        if (active) {
          setLoadingSubmissions(false);
        }
      }
    }
    loadSubmissions();
    return () => {
      active = false;
    };
  }, []);

  const filteredBookings = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return bookings.filter((item) => {
      if (bookingFilter === "all") {
        return true;
      }
      // Use the booking's selected date for upcoming/past logic.
      // `event_date` is the event's primary date and may not match the user's selected date for multi-day bookings.
      const bookingDate = new Date(item.booking_date);
      if (Number.isNaN(bookingDate.getTime())) {
        return bookingFilter === "all";
      }
      bookingDate.setHours(0, 0, 0, 0);
      if (bookingFilter === "upcoming") {
        return bookingDate >= today;
      }
      return bookingDate < today;
    });
  }, [bookings, bookingFilter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Mobile + Tablet layout (does not affect desktop). */}
      <div className="lg:hidden space-y-4">
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 text-white shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-lg font-bold text-white ring-1 ring-white/15">
                {profileInitial || <FiUser className="h-5 w-5" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold">{profile?.name || user?.name || "User"}</p>
                <p className="truncate text-xs text-white/70">{profile?.email || user?.email}</p>
                <p className="truncate text-xs text-white/60">{profile?.mobile_number || "Add mobile number"}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setProfileError("");
                setProfileMessage("");
                setProfileEditorTab("basic");
                setShowProfileEditor(true);
              }}
              className="shrink-0 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold ring-1 ring-white/15 hover:bg-white/15"
            >
              Edit
            </button>
          </div>

          {profileMessage ? <p className="mt-3 text-sm font-medium text-emerald-200">{profileMessage}</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                setPasswordError("");
                setPasswordMessage("");
                setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                setShowPasswordModal(true);
              }}
              className="rounded-2xl bg-white/10 px-3 py-3 text-left ring-1 ring-white/10 hover:bg-white/15"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Password</p>
              <p className="mt-1 text-sm font-semibold">{isGoogleFirstPassword ? "Set password" : "Change password"}</p>
            </button>

            <div className="rounded-2xl bg-white/10 px-3 py-3 text-left ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Favorites</p>
              <p className="mt-1 text-sm font-semibold">{favorites.length}</p>
            </div>

            <div className="rounded-2xl bg-white/10 px-3 py-3 text-left ring-1 ring-white/10">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Bookings</p>
              <p className="mt-1 text-sm font-semibold">{bookings.length}</p>
            </div>

            <Link
              to="/dashboard/user/submissions"
              className="rounded-2xl bg-white/10 px-3 py-3 text-left ring-1 ring-white/10 hover:bg-white/15"
            >
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Deal Submissions</p>
              <p className="mt-1 text-sm font-semibold">
                {dealerStatus && String(dealerStatus).toLowerCase() === "approved" ? myDealSubmissions.length : 0}
              </p>
            </Link>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Quick actions</h2>
              <p className="mt-1 text-sm text-slate-600">Everything you need, faster on mobile.</p>
            </div>
            {canOrganize ? (
              <Link
                to="/dashboard/organizer"
                className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
              >
                Organizer
              </Link>
            ) : null}
          </div>

          {!canOrganize ? (
            <button
              type="button"
              disabled={enablingOrganizer}
              onClick={async () => {
                try {
                  setOrganizerEnableError("");
                  setEnablingOrganizer(true);
                  await enableOrganizer();
                  const refreshTokenValue = localStorage.getItem("refreshToken");
                  if (refreshTokenValue) {
                    const refreshed = await refreshAccessToken(refreshTokenValue);
                    const payload = refreshed?.data;
                    if (payload?.accessToken && payload?.refreshToken && payload?.user) {
                      login(payload);
                    }
                  }
                } catch (_err) {
                  setOrganizerEnableError("Could not enable organizer capabilities. Please try again.");
                } finally {
                  setEnablingOrganizer(false);
                }
              }}
              className="mt-3 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {enablingOrganizer ? "Enabling..." : "Enable Organizer"}
            </button>
          ) : null}
          {organizerEnableError ? <p className="mt-2 text-sm font-medium text-rose-600">{organizerEnableError}</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900">My Content Submissions</h2>
              <p className="mt-1 text-sm text-slate-600">
                Influencer and deal submissions currently under admin review.
              </p>
            </div>
            <Link
              to="/dashboard/user/submissions"
              className="shrink-0 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
            >
              Open Submissions
            </Link>
          </div>

          {loadingSubmissions ? <p className="mt-2 text-sm text-slate-500">Loading submissions...</p> : null}
          {submissionsError ? <p className="mt-2 text-sm text-rose-600">{submissionsError}</p> : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">My Registered Events</h2>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 p-1">
              <button
                type="button"
                onClick={() => setBookingFilter("upcoming")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  bookingFilter === "upcoming" ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("past")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  bookingFilter === "past" ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                Past
              </button>
              <button
                type="button"
                onClick={() => setBookingFilter("all")}
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  bookingFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600"
                }`}
              >
                All
              </button>
            </div>
          </div>

          {loadingBookings ? <p className="mt-2 text-sm text-slate-500">Loading bookings...</p> : null}
          {bookingsError ? <p className="mt-2 text-sm text-rose-600">{bookingsError}</p> : null}

          {!loadingBookings && !bookingsError && bookings.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-900">No bookings yet.</p>
              <Link to="/events" className="mt-3 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                Explore Events
              </Link>
            </div>
          ) : null}

          {!loadingBookings && !bookingsError && filteredBookings.length === 0 && bookings.length > 0 ? (
            <p className="mt-3 text-sm text-slate-500">No bookings match the selected filter.</p>
          ) : null}

          {!loadingBookings && !bookingsError && filteredBookings.length ? (
            <div className="mt-3 space-y-3">
              {filteredBookings.map((b) => {
                const locationUrl = getLocationUrl(b);
                const timeLabel = b.event_time ? String(b.event_time).slice(0, 5) : "Time not specified";
                const totalLabel = formatCurrency(b.total_amount || b.price || 0);
                return (
                  <article
                    key={b.booking_id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft transition hover:shadow-md"
                  >
                    <img
                      src={b.event_image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900"}
                      alt={b.event_title}
                      className="aspect-[4/3] w-full object-cover"
                      loading="lazy"
                    />
                    <div className="space-y-2 p-4">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-bold text-slate-900">{b.event_title}</h3>
                        <p className="truncate text-sm text-slate-600">
                          {b.city || "City"} • {b.venue_name || "Venue to be announced"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-700">
                          {formatReadableDate(b.booking_date)} • {timeLabel}
                        </p>
                        <div className="mt-2 space-y-1 text-xs text-slate-700">
                          <p>
                            Guests: <span className="font-semibold">{b.attendee_count ?? 0}</span>
                          </p>
                          <p>
                            Days: <span className="font-semibold">{b.total_days || 1}</span>
                          </p>
                          <p>
                            Total: <span className="font-semibold">{totalLabel}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Link
                          to={`/events/${b.event_id}`}
                          className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                        >
                          View Event
                        </Link>
                        {locationUrl ? (
                          <a
                            href={locationUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                          >
                            View Location
                          </a>
                        ) : (
                          <span className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400">
                            View Location
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled
                        className="w-full rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                        title="Cancel Booking coming soon"
                      >
                        Cancel Booking (Coming Soon)
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-slate-900">Saved Items</h2>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {favorites.length}
            </span>
          </div>
          {loading ? <p className="mt-2 text-sm text-slate-500">Loading favorites...</p> : null}
          {!loading && favorites.length === 0 ? <p className="mt-2 text-sm text-slate-500">No saved items yet.</p> : null}
          {!loading && favorites.length ? (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {favorites.map((item) => {
                const displayPrice = getDisplayPrice(item);
                const detailsUrl = getFavoriteDetailsUrl(item);

                return (
                  <article
                    key={item.id}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-slate-50"
                  >
                    <img
                      src={item.image_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600"}
                      alt={item.title}
                      className="h-20 w-20 rounded-lg object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase text-slate-500">{item.listing_type}</p>
                      <p className="truncate text-xs font-bold text-slate-900">{item.title}</p>
                      <p className="truncate text-xs text-slate-500">
                        {item.category_name || "Category"} • {item.city_name || "City"}
                      </p>
                      {displayPrice !== null ? (
                        <p className="mt-1 text-xs font-semibold text-slate-700">
                          {formatCurrency(displayPrice)}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-col items-end justify-between gap-2">
                      {detailsUrl ? (
                        <Link
                          to={detailsUrl}
                          className="inline-flex rounded-full bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white transition hover:bg-slate-700"
                        >
                          Open
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        onClick={() =>
                          toggleFavorite({
                            listingType: item.listing_type,
                            listingId: item.listing_id
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>
      </div>

      {/* Desktop layout (unchanged). */}
      <div className="hidden lg:block space-y-4">
      <h1 className="text-2xl font-bold">My Dashboard</h1>
      <p className="text-sm text-slate-600">Track your bookings, saved listings, and account activity in one place.</p>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white">
              {profileInitial || <FiUser className="h-6 w-6" />}
            </div>
            <div className="min-w-0">
              <p className="text-base font-semibold text-slate-900">{profile?.name || user?.name || "User"}</p>
              <p className="text-sm text-slate-600">{profile?.email || user?.email}</p>
              <p className="text-xs text-slate-500">{profile?.mobile_number || "Add mobile number"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setPasswordError("");
                setPasswordMessage("");
                setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                setShowPasswordModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              title={isGoogleFirstPassword ? "Set your password" : "Change password"}
            >
              <FiKey className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="hidden sm:inline">{isGoogleFirstPassword ? "Set password" : "Password"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileError("");
                setProfileMessage("");
                setProfileEditorTab("basic");
                setShowProfileEditor(true);
              }}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <FiEdit2 className="h-4 w-4" />
              Edit Profile
            </button>
          </div>
        </div>
        {profileMessage ? <p className="mt-3 text-sm font-medium text-emerald-700">{profileMessage}</p> : null}
      </section>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">My Registered Events</p>
          <p className="mt-1 text-2xl font-bold">{bookings.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Favorites</p>
          <p className="mt-1 text-2xl font-bold">{favorites.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Influencer Submissions</p>
          <p className="mt-1 text-2xl font-bold">{myInfluencerSubmissions.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Deal Submissions</p>
          <p className="mt-1 text-2xl font-bold">
            {dealerStatus && String(dealerStatus).toLowerCase() === "approved" ? myDealSubmissions.length : 0}
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        {canOrganize ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Organizer capabilities enabled</p>
              <p className="text-sm text-slate-600">Manage your events in the Organizer Dashboard.</p>
            </div>
            <Link
              to="/dashboard/organizer"
              className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              Open Organizer Dashboard
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900">Want to create events?</p>
              <p className="text-sm text-slate-600">Enable organizer capabilities to create and manage your events.</p>
              {organizerEnableError ? (
                <p className="mt-1 text-sm font-medium text-rose-600">{organizerEnableError}</p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={enablingOrganizer}
              onClick={async () => {
                try {
                  setOrganizerEnableError("");
                  setEnablingOrganizer(true);
                  await enableOrganizer();

                  // Refresh auth state so `canOrganize` flips to true without leaving the page.
                  const refreshTokenValue = localStorage.getItem("refreshToken");
                  if (refreshTokenValue) {
                    const refreshed = await refreshAccessToken(refreshTokenValue);
                    const payload = refreshed?.data;
                    if (payload?.accessToken && payload?.refreshToken && payload?.user) {
                      login(payload);
                    }
                  }
                } catch (_err) {
                  setOrganizerEnableError("Could not enable organizer capabilities. Please try again.");
                } finally {
                  setEnablingOrganizer(false);
                }
              }}
              className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {enablingOrganizer ? "Enabling..." : "Enable Organizer"}
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">My Content Submissions</h2>
            <p className="text-sm text-slate-600">Manage influencer and deal submissions in a dedicated workspace.</p>
          </div>
          <Link
            to="/dashboard/user/submissions"
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Open Submissions
          </Link>
        </div>
        {loadingSubmissions ? <p className="mt-2 text-sm text-slate-500">Loading submission counts...</p> : null}
        {submissionsError ? <p className="mt-2 text-sm text-rose-600">{submissionsError}</p> : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">My Registered Events</h2>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setBookingFilter("upcoming")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                bookingFilter === "upcoming" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Upcoming Events
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter("past")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                bookingFilter === "past" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              Past Events
            </button>
            <button
              type="button"
              onClick={() => setBookingFilter("all")}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                bookingFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600"
              }`}
            >
              All
            </button>
          </div>
        </div>

        {loadingBookings ? <p className="text-sm text-slate-500">Loading your bookings...</p> : null}
        {bookingsError ? <p className="text-sm text-rose-600">{bookingsError}</p> : null}

        {!loadingBookings && !bookingsError && bookings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <h3 className="text-base font-semibold text-slate-900">
              You haven&apos;t registered for any events yet.
            </h3>
            <Link
              to="/events"
              className="mt-4 inline-flex rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
            >
              Explore Events
            </Link>
          </div>
        ) : null}

        {!loadingBookings && !bookingsError && bookings.length > 0 && filteredBookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings match the selected filter.</p>
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBookings.map((booking) => {
            const locationUrl = getLocationUrl(booking);
            return (
              <article
                key={booking.booking_id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
              >
                <img
                  src={booking.event_image || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=900"}
                  alt={booking.event_title}
                  className="aspect-[4/3] w-full object-cover"
                />
                <div className="space-y-2 p-4">
                  <h3 className="text-base font-bold text-slate-900">{booking.event_title}</h3>
                  <p className="text-sm text-slate-600">
                    {booking.city || "City"} • {booking.venue_name || "Venue to be announced"}
                  </p>
                  {booking.venue_address ? (
                    <p className="text-xs text-slate-500">{booking.venue_address}</p>
                  ) : null}
                  <p className="text-sm text-slate-600">
                    {formatReadableDate(booking.booking_date)} •{" "}
                    {booking.event_time ? String(booking.event_time).slice(0, 5) : "Time not specified"}
                  </p>
                  <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    <p>
                      Guests: <span className="font-semibold">{booking.attendee_count}</span>
                    </p>
                    <p>
                      Days: <span className="font-semibold">{booking.total_days || 1}</span>
                    </p>
                    <p>
                      Selected Dates:{" "}
                      <span className="font-semibold">
                        {Array.isArray(booking.selected_dates) && booking.selected_dates.length
                          ? booking.selected_dates.map((d) => formatReadableDate(d)).join(", ")
                          : formatReadableDate(booking.booking_date)}
                      </span>
                    </p>
                    <p>
                      Booked On: <span className="font-semibold">{formatReadableDate(booking.created_at)}</span>
                    </p>
                    <p>
                      Total: <span className="font-semibold">{formatCurrency(booking.total_amount || booking.price || 0)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Link
                      to={`/events/${booking.event_id}`}
                      className="inline-flex flex-1 items-center justify-center rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white"
                    >
                      View Event
                    </Link>
                    {locationUrl ? (
                      <a
                        href={locationUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700"
                      >
                        View Location
                      </a>
                    ) : (
                      <span className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400">
                        View Location
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-400"
                    title="Cancel Booking coming soon"
                  >
                    Cancel Booking (Coming Soon)
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">Saved Items</h2>
        {loading ? <p className="text-sm text-slate-500">Loading favorites...</p> : null}
        {!loading && favorites.length === 0 ? (
          <p className="text-sm text-slate-500">You have no saved listings yet.</p>
        ) : null}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {favorites.map((item) => {
            const displayPrice = getDisplayPrice(item);
            return (
              <article key={item.id} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                <img
                  src={item.image_url || "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600"}
                  alt={item.title}
                  className="h-20 w-20 rounded-lg object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase text-slate-500">{item.listing_type}</p>
                  <p className="truncate text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    {item.category_name || "Category"} • {item.city_name || "City"}
                  </p>
                  {displayPrice !== null ? (
                    <p className="mt-1 text-xs font-semibold text-slate-700">{formatCurrency(displayPrice)}</p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className="self-start rounded-md border border-slate-300 px-2 py-1 text-xs"
                  onClick={() =>
                    toggleFavorite({
                      listingType: item.listing_type,
                      listingId: item.listing_id
                    })
                  }
                >
                  Remove
                </button>
              </article>
            );
          })}
        </div>
      </section>
      </div>

      {showProfileEditor ? renderInPortal(
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-900/50 px-3 py-4 sm:px-6"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex h-[min(74vh,620px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
          >
            <div className="border-b border-slate-200 px-5 pb-4 pt-5 sm:px-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Edit profile</h3>
                  <p className="text-sm text-slate-600">Keep your account details updated for a smoother experience.</p>
                {dealerStatus ? (
                  <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Dealer profile:{" "}
                    <span
                      className={
                        dealerStatus === "approved"
                          ? "text-emerald-700"
                          : dealerStatus === "rejected"
                            ? "text-rose-700"
                            : "text-amber-700"
                      }
                    >
                      {dealerStatus}
                    </span>
                  </p>
                ) : null}
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  Step {currentTabIndex + 1} of {profileTabs.length}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="h-full rounded-full bg-slate-900"
                />
              </div>
            </div>
            <div className="border-b border-slate-200 px-5 py-3 sm:px-6">
              <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-50 p-1">
              {profileTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setProfileEditorTab(tab.key)}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                    profileEditorTab === tab.key
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
              </div>
            </div>
            <form
              className="flex min-h-0 flex-1 flex-col"
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileError("");
                setProfileMessage("");
                try {
                  setSavingProfile(true);
                  const toNumberOrUndefined = (value) => {
                    if (value === "" || value === null || value === undefined) {
                      return undefined;
                    }
                    const parsed = Number(value);
                    return Number.isFinite(parsed) ? parsed : undefined;
                  };

                  const response = await updateMyProfile({
                    first_name: profileForm.first_name,
                    last_name: profileForm.last_name,
                    email: profileForm.email,
                    mobile_number: profileForm.mobile_number,
                    city_id: toNumberOrUndefined(profileForm.city_id),
                    interests: profileForm.interests,
                    wants_influencer: profileForm.wants_influencer,
                    wants_deal: profileForm.wants_deal,
                    influencer_profile: profileForm.wants_influencer
                      ? {
                          ...influencerProfile,
                          category_id: toNumberOrUndefined(influencerProfile.category_id)
                        }
                      : undefined,
                    deal_profile: profileForm.wants_deal
                      ? {
                          ...dealProfile,
                          category_id: toNumberOrUndefined(dealProfile.category_id)
                        }
                      : undefined
                  });
                  const latestProfile = response?.data || null;
                  setProfile(latestProfile);
                  if (latestProfile && accessToken) {
                    login({
                      accessToken,
                      refreshToken,
                      user: latestProfile
                    });
                  }
                  setProfileMessage(response?.message || "Profile updated successfully.");
                  setShowProfileEditor(false);
                } catch (err) {
                  setProfileError(err?.response?.data?.message || "Could not update profile. Please try again.");
                } finally {
                  setSavingProfile(false);
                }
              }}
            >
              <motion.div
                key={profileEditorTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4 sm:px-6"
              >
                {profileEditorTab === "basic" ? (
                  <>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <input
                        type="text"
                        required
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((s) => ({ ...s, first_name: e.target.value }))}
                        placeholder="First name"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                      />
                      <input
                        type="text"
                        required
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((s) => ({ ...s, last_name: e.target.value }))}
                        placeholder="Last name"
                        className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                      />
                    </div>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="Email"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    />
                    <input
                      type="text"
                      value={profileForm.mobile_number}
                      onChange={(e) => setProfileForm((s) => ({ ...s, mobile_number: e.target.value }))}
                      placeholder="Mobile number"
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    />
                    <select
                      required
                      value={profileForm.city_id}
                      onChange={(e) => setProfileForm((s) => ({ ...s, city_id: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm"
                    >
                      <option value="">Select city</option>
                      {cities.map((city) => (
                        <option key={city.value} value={city.value}>
                          {city.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}

                {profileEditorTab === "preferences" ? (
                  <>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Interested in</p>
                      <div className="flex flex-wrap gap-2">
                        {interestOptions.map((interest) => {
                          const active = profileForm.interests.includes(interest);
                          return (
                            <button
                              key={interest}
                              type="button"
                              onClick={() =>
                                setProfileForm((s) => ({
                                  ...s,
                                  interests: active
                                    ? s.interests.filter((item) => item !== interest)
                                    : [...s.interests, interest]
                                }))
                              }
                              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                active ? "bg-slate-900 text-white" : "bg-white text-slate-700"
                              }`}
                            >
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={profileForm.wants_influencer}
                          disabled={isDealerPending || isInfluencerPending}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (!checked && hasInfluencerDetails) {
                              setProfileError("Influencer option cannot be unchecked after profile details are added.");
                              return;
                            }
                            if (isInfluencerPending) {
                              setProfileError("Influencer profile is pending admin review. This toggle is locked until review is complete.");
                              return;
                            }
                            if (isDealerPending) {
                              setProfileError("Dealer profile is pending admin review. Influencer and dealer toggles are locked until review is complete.");
                              return;
                            }
                            if (!checked && isInfluencerPending) {
                              setProfileError("Influencer profile is pending admin review. You can change this after approval or rejection.");
                              return;
                            }
                            setProfileError("");
                            setProfileForm((s) => ({ ...s, wants_influencer: checked }));
                            if (checked) {
                              setActiveCreatorModal("influencer");
                            }
                          }}
                        />
                        I am an influencer
                      </label>
                      <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={profileForm.wants_deal}
                          disabled={isDealerPending}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            if (!checked && hasDealerDetails) {
                              setProfileError("Dealer option cannot be unchecked after profile details are added.");
                              return;
                            }
                            if (isDealerPending) {
                              setProfileError("Dealer profile is pending admin review. Influencer and dealer toggles are locked until review is complete.");
                              return;
                            }
                            if (!checked && isDealerPending) {
                              setProfileError("Dealer profile is pending admin review. You can change this after approval or rejection.");
                              return;
                            }
                            setProfileError("");
                            setProfileForm((s) => ({ ...s, wants_deal: checked }));
                            if (checked) {
                              setActiveCreatorModal("dealer");
                            }
                          }}
                        />
                        I offer deals
                      </label>
                    </div>
                  </>
                ) : null}

                {profileEditorTab === "creator" ? (
                  <>
                    {profileForm.wants_influencer ? (
                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Influencer profile</p>
                        {hasInfluencerDetails ? (
                          <div className="space-y-1 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">{influencerProfile.name}</p>
                            <p>{influencerProfile.bio}</p>
                            <p>Category: {categories.find((c) => c.value === influencerProfile.category_id)?.label || "-"}</p>
                            <p>Contact: {influencerProfile.contact_email}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No influencer details added yet.</p>
                        )}
                        <button
                          type="button"
                          disabled={isInfluencerPending}
                          onClick={() => setActiveCreatorModal("influencer")}
                          className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isInfluencerPending ? "Pending Review" : "Edit Influencer"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Enable “I am an influencer” in Preferences to edit influencer details.</p>
                    )}
                    {profileForm.wants_deal ? (
                      <div className="rounded-xl border border-slate-200 p-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Dealer profile</p>
                        {hasDealerDetails ? (
                          <div className="space-y-1 text-sm text-slate-700">
                            <p className="font-semibold text-slate-900">{dealProfile.name}</p>
                            <p>{dealProfile.bio}</p>
                            <p>Location: {dealProfile.location_text}</p>
                            <p>Business Email: {dealProfile.business_email}</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">No dealer details added yet.</p>
                        )}
                        <button
                          type="button"
                          disabled={isDealerPending}
                          onClick={() => setActiveCreatorModal("dealer")}
                          className="mt-3 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDealerPending ? "Pending Review" : "Edit Dealer"}
                        </button>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Enable “I offer deals” in Preferences to edit deal details.</p>
                    )}
                  </>
                ) : null}
              </motion.div>
              <div className="border-t border-slate-200 px-5 py-4 sm:px-6">
              {profileError ? <p className="mb-3 text-sm font-medium text-rose-600">{profileError}</p> : null}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTabIndex > 0) {
                        setProfileEditorTab(profileTabs[currentTabIndex - 1].key);
                      }
                    }}
                    disabled={currentTabIndex === 0}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTabIndex < profileTabs.length - 1) {
                        setProfileEditorTab(profileTabs[currentTabIndex + 1].key);
                      }
                    }}
                    disabled={currentTabIndex >= profileTabs.length - 1}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowProfileEditor(false)}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {savingProfile ? "Saving..." : "Save Changes"}
                </button>
                </div>
              </div>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}

      {showPasswordModal
        ? renderInPortal(
            <div className="fixed inset-0 z-[92] flex items-center justify-center bg-slate-900/50 px-3 py-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {isGoogleFirstPassword ? "Set your password" : "Change password"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {isGoogleFirstPassword
                        ? "Create a password so you can also sign in with email and password."
                        : "Enter your current password, then your new password."}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100"
                  >
                    Close
                  </button>
                </div>
                <form
                  className="mt-4 space-y-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPasswordError("");
                    setPasswordMessage("");
                    if (passwordForm.new_password !== passwordForm.confirm_password) {
                      setPasswordError("New passwords do not match.");
                      return;
                    }
                    if (passwordForm.new_password.length < 8) {
                      setPasswordError("New password must be at least 8 characters.");
                      return;
                    }
                    if (!isGoogleFirstPassword && !passwordForm.current_password.trim()) {
                      setPasswordError("Enter your current password.");
                      return;
                    }
                    try {
                      setPasswordSaving(true);
                      const res = await changeMyPassword(
                        isGoogleFirstPassword
                          ? { new_password: passwordForm.new_password }
                          : {
                              current_password: passwordForm.current_password,
                              new_password: passwordForm.new_password
                            }
                      );
                      setPasswordMessage(res?.message || "Password saved.");
                      if (isGoogleFirstPassword) {
                        setProfile((p) => (p ? { ...p, has_local_password: true } : p));
                      }
                      setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                      window.setTimeout(() => {
                        setShowPasswordModal(false);
                        setPasswordMessage("");
                      }, 1600);
                    } catch (err) {
                      setPasswordError(err?.response?.data?.message || "Could not update password.");
                    } finally {
                      setPasswordSaving(false);
                    }
                  }}
                >
                  {!isGoogleFirstPassword ? (
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Current password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((s) => ({ ...s, current_password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      required
                    />
                  ) : null}
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="New password (min 8 characters)"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm((s) => ({ ...s, new_password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    required
                    minLength={8}
                  />
                  <input
                    type="password"
                    autoComplete="new-password"
                    placeholder="Confirm new password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm((s) => ({ ...s, confirm_password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                    required
                  />
                  {passwordError ? <p className="text-sm font-medium text-rose-600">{passwordError}</p> : null}
                  {passwordMessage ? <p className="text-sm font-medium text-emerald-700">{passwordMessage}</p> : null}
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {passwordSaving
                        ? "Saving..."
                        : isGoogleFirstPassword
                          ? "Set password"
                          : "Update password"}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )
        : null}

      {showProfileEditor && activeCreatorModal === "influencer"
        ? renderInPortal(
            <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 px-3 py-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex h-[min(76vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <h3 className="text-lg font-semibold">Influencer onboarding</h3>
                  <p className="mb-4 text-sm text-slate-600">Complete this section to keep your creator profile updated.</p>
                  <div className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-2">
                    <FormField label="Profile Name" hint="Enter your public creator or brand name." example="Ava Luxe" className="sm:col-span-2">
                      <input value={influencerProfile.name} onChange={(e) => setInfluencerProfile((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Bio" hint="Write a short summary of your niche and audience." example="Fashion and lifestyle creator in New York." className="sm:col-span-2">
                      <textarea rows={4} value={influencerProfile.bio} onChange={(e) => setInfluencerProfile((s) => ({ ...s, bio: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="City" hint="Choose your primary operating city.">
                      <select value={profileForm.city_id} onChange={(e) => setProfileForm((s) => ({ ...s, city_id: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                        <option value="">Select city</option>
                        {cities.map((city) => (
                          <option key={city.value} value={city.value}>{city.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Category" hint="Select the content category that fits your profile.">
                      <select value={influencerProfile.category_id} onChange={(e) => setInfluencerProfile((s) => ({ ...s, category_id: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                        <option value="">Select category</option>
                        {categories.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Contact Email" hint="Use an email where brands can contact you." example="creator@example.com">
                      <input type="email" value={influencerProfile.contact_email} onChange={(e) => setInfluencerProfile((s) => ({ ...s, contact_email: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Instagram URL" hint="Paste your Instagram profile link." example="https://instagram.com/yourhandle">
                      <input type="url" value={influencerProfile.instagram} onChange={(e) => setInfluencerProfile((s) => ({ ...s, instagram: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Instagram Followers Count" hint="Enter your Instagram follower count (numbers only)." example="12500">
                      <input
                        type="number"
                        min="0"
                        required
                        value={influencerProfile.followers_count}
                        onChange={(e) => setInfluencerProfile((s) => ({ ...s, followers_count: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </FormField>
                    <FormField label="YouTube URL" hint="Paste your channel or profile link." example="https://youtube.com/@yourchannel">
                      <input type="url" value={influencerProfile.youtube} onChange={(e) => setInfluencerProfile((s) => ({ ...s, youtube: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Profile Image URL" hint="Add a high-quality profile image link." example="https://images.example.com/profile.jpg">
                      <input type="url" value={influencerProfile.profile_image_url} onChange={(e) => setInfluencerProfile((s) => ({ ...s, profile_image_url: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                  </div>
                </div>
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasInfluencerDetails) {
                        setProfileForm((s) => ({ ...s, wants_influencer: false }));
                      }
                      setActiveCreatorModal(null);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={() => setActiveCreatorModal(null)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save details</button>
                </div>
              </motion.div>
            </div>
          )
        : null}

      {showProfileEditor && activeCreatorModal === "dealer"
        ? renderInPortal(
            <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-900/55 px-3 py-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex h-[min(76vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <h3 className="text-lg font-semibold">Dealer profile onboarding</h3>
                  <p className="mb-4 text-sm text-slate-600">Keep your dealer profile updated for admin moderation.</p>
                  <div className="grid grid-cols-1 gap-3 pb-16 sm:grid-cols-2">
                    <FormField label="Business Name" hint="Enter your store or brand name." example="Glow City Deals" className="sm:col-span-2">
                      <input value={dealProfile.name} onChange={(e) => setDealProfile((s) => ({ ...s, name: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Business Email" hint="Use your official business contact email." example="hello@glowcity.com">
                      <input type="email" value={dealProfile.business_email} onChange={(e) => setDealProfile((s) => ({ ...s, business_email: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Business Mobile" hint="Primary WhatsApp/contact number for deal inquiries." example="+1 512 555 0199">
                      <input value={dealProfile.business_mobile} onChange={(e) => setDealProfile((s) => ({ ...s, business_mobile: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Business Location" hint="Choose your city or Virtual / Online as business location.">
                      <select
                        value={dealerLocationOptions.find((opt) => opt.label === dealProfile.location_text)?.value || ""}
                        onChange={(e) => {
                          const option = dealerLocationOptions.find((opt) => String(opt.value) === String(e.target.value));
                          if (!option) return;
                          setDealProfile((s) => ({ ...s, location_text: option.label }));
                          if (option.cityId) setProfileForm((s) => ({ ...s, city_id: String(option.cityId) }));
                        }}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      >
                        <option value="">Select location</option>
                        {dealerLocationOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="Category" hint="Select the closest category for your business offerings.">
                      <select value={dealProfile.category_id} onChange={(e) => setDealProfile((s) => ({ ...s, category_id: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm">
                        <option value="">Select category</option>
                        {categories.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </FormField>
                    <FormField label="About / Bio" hint="Add a short summary of your business and what you offer." example="Curating premium beauty and wellness offers in NYC." className="sm:col-span-2">
                      <textarea rows={4} value={dealProfile.bio} onChange={(e) => setDealProfile((s) => ({ ...s, bio: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Website / Social Link" hint="Add your business website or social page URL." example="https://instagram.com/glowcitydeals">
                      <input value={dealProfile.website_or_social_link} onChange={(e) => setDealProfile((s) => ({ ...s, website_or_social_link: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <FormField label="Profile Image / Logo URL" hint="Paste a public logo or profile image URL." example="https://images.example.com/logo.png">
                      <input value={dealProfile.profile_image_url} onChange={(e) => setDealProfile((s) => ({ ...s, profile_image_url: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                  </div>
                </div>
                <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-200 bg-white/95 px-5 py-3 backdrop-blur sm:px-6">
                  <button
                    type="button"
                    onClick={() => {
                      if (!hasDealerDetails) {
                        setProfileForm((s) => ({ ...s, wants_deal: false }));
                      }
                      setActiveCreatorModal(null);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button type="button" onClick={() => setActiveCreatorModal(null)} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save details</button>
                </div>
              </motion.div>
            </div>
          )
        : null}

    </motion.div>
  );
}

export default UserDashboardPage;
