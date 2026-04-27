import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiEdit2, FiInfo, FiKey, FiUser } from "react-icons/fi";
import useFavorites from "../hooks/useFavorites";
import useAuth from "../hooks/useAuth";
import YayUserGreeting from "../components/YayUserGreeting";
import { fetchMyBookings } from "../services/bookingService";
import { createDeal, fetchMyDealSubmissions, fetchMyInfluencerSubmissions } from "../services/listingService";
import DealSubmissionModal, { emptyDealSubmitForm } from "../components/DealSubmissionModal";
import { formatCurrency, formatDateUS } from "../utils/format";
import { refreshAccessToken } from "../services/authService";
import { changeMyPassword, enableOrganizer, fetchMyProfile, updateMyProfile } from "../services/userService";
import { categories } from "../utils/filterOptions";
import { parseInfluencerSocialLinks } from "../utils/influencerSocial";
import useCityFilter from "../hooks/useCityFilter";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import AppLoadingOverlay from "../components/AppLoadingOverlay";
import OrganizerDashboardPage from "./OrganizerDashboardPage";
import CloudinaryImageInput from "../components/CloudinaryImageInput";
import UserSubmissionsPanel from "../components/UserSubmissionsPanel";
import { fetchMyEvents } from "../services/eventService";

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
  { key: "basic", label: "About you" },
  { key: "preferences", label: "Interests" }
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
  const location = useLocation();
  const navigate = useNavigate();
  const { cities } = useCityFilter();
  const { user, accessToken, refreshToken, login, canPostDeals } = useAuth();
  const { favorites, loading, toggleFavorite } = useFavorites();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingFilter, setBookingFilter] = useState("upcoming");
  const [desktopWorkspaceTab, setDesktopWorkspaceTab] = useState("events");
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState("events");
  const [myEventsCount, setMyEventsCount] = useState(0);
  const [enablingOrganizer, setEnablingOrganizer] = useState(false);
  const [organizerEnableError, setOrganizerEnableError] = useState("");
  const [myInfluencerSubmissions, setMyInfluencerSubmissions] = useState([]);
  const [myDealSubmissions, setMyDealSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [profile, setProfile] = useState(user || null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [creatorModal, setCreatorModal] = useState(null);
  const [creatorHubOpen, setCreatorHubOpen] = useState(false);
  const [eventsWorkspaceOpen, setEventsWorkspaceOpen] = useState(false);
  const [organizerWorkspaceReady, setOrganizerWorkspaceReady] = useState(false);
  const organizerFormShellRef = useRef(null);
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
    facebook: "",
    youtube: "",
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
  const [dealSubmitOpen, setDealSubmitOpen] = useState(false);
  const [dealSubmitLoading, setDealSubmitLoading] = useState(false);
  const [dealSubmitError, setDealSubmitError] = useState("");
  const [dealSubmitForm, setDealSubmitForm] = useState(() => ({ ...emptyDealSubmitForm }));
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
  const hasRegisteredDealer = Boolean(profile?.dealer_profile);
  const hasInfluencerDetails = Boolean(
    influencerProfile.name?.trim() &&
      influencerProfile.bio?.trim() &&
      influencerProfile.category_id &&
      profileForm.city_id &&
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
    [cities]
  );

  const businessProfileCta = useMemo(() => {
    if (isDealerPending) {
      return {
        label: "Business profile · in review",
        sub: "We’ll email you when it’s reviewed.",
        disabled: true
      };
    }
    if (hasRegisteredDealer) {
      return {
        label: "Edit business profile",
        sub: "Update your dealer details for moderation.",
        disabled: false
      };
    }
    return {
      label: "Register your business",
      sub: "Set up your business profile — offers go live after approval.",
      disabled: false
    };
  }, [isDealerPending, hasRegisteredDealer]);

  const infStatusLower = String(influencerStatus || "").toLowerCase();

  const influencerSpotlightCta = useMemo(() => {
    if (infStatusLower === "pending") {
      return {
        label: "Creator spotlight · In review",
        sub: "We’ll email you when it’s live."
      };
    }
    if (myInfluencerSubmissions.length > 0 && infStatusLower === "approved") {
      return { label: "Edit your creator spotlight", sub: "Polish your public creator page." };
    }
    if (myInfluencerSubmissions.length > 0 && infStatusLower === "rejected") {
      return { label: "Revise your creator spotlight", sub: "Update and resubmit for review." };
    }
    if (hasInfluencerDetails) {
      return { label: "Update your creator spotlight", sub: "Keep your story fresh." };
    }
    return {
      label: "Share your creator story",
      sub: "Tell us about you — get spotlighted on Yay!"
    };
  }, [infStatusLower, myInfluencerSubmissions.length, hasInfluencerDetails]);

  const isGoogleUser = useMemo(
    () => String(profile?.auth_provider || user?.auth_provider || "").toLowerCase() === "google",
    [profile?.auth_provider, user?.auth_provider]
  );
  /** Google: no local password yet — “Set” copy; otherwise still no current-password field */
  const isGoogleFirstPassword = isGoogleUser && profile?.has_local_password !== true;

  useRouteContentReady(loadingBookings || loadingSubmissions);

  useEffect(() => {
    if (showProfileEditor && profileTabs.every((t) => t.key !== profileEditorTab)) {
      setProfileEditorTab("basic");
    }
  }, [showProfileEditor, profileEditorTab]);

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
    let active = true;
    async function loadMyEventsCount() {
      try {
        const response = await fetchMyEvents();
        if (!active) return;
        setMyEventsCount(Array.isArray(response?.data) ? response.data.length : 0);
      } catch (_err) {
        if (!active) return;
        setMyEventsCount(0);
      }
    }
    loadMyEventsCount();
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
      facebook: links.facebook || prev.facebook,
      youtube: links.youtube || prev.youtube,
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
    const overlayOpen =
      showProfileEditor ||
      showPasswordModal ||
      creatorHubOpen ||
      eventsWorkspaceOpen ||
      Boolean(creatorModal);
    if (!overlayOpen) {
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
  }, [showProfileEditor, showPasswordModal, creatorHubOpen, eventsWorkspaceOpen, creatorModal]);

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

  useEffect(() => {
    if (location.hash === "#host-events") {
      requestAnimationFrame(() => setEventsWorkspaceOpen(true));
    }
  }, [location.hash, location.pathname]);

  useEffect(() => {
    if (!dealSubmitOpen) {
      return undefined;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [dealSubmitOpen]);

  useEffect(() => {
    if (!eventsWorkspaceOpen) {
      setOrganizerWorkspaceReady(false);
    }
  }, [eventsWorkspaceOpen]);

  const handleOrganizerWorkspaceInitialReady = useCallback(() => {
    setOrganizerWorkspaceReady(true);
  }, []);

  const showHostingWorkspaceLoading =
    enablingOrganizer || (eventsWorkspaceOpen && !organizerWorkspaceReady);

  const enableHostingIfNeeded = async () => {
    if (!canOrganize) {
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
        setOrganizerEnableError("We couldn’t turn on hosting just now. Try again in a moment.");
      } finally {
        setEnablingOrganizer(false);
      }
    }
  };

  const onListExperienceClick = async () => {
    await enableHostingIfNeeded();
    setEventsWorkspaceOpen(true);
  };

  const onPostEventClick = async () => {
    await enableHostingIfNeeded();
    requestAnimationFrame(() => {
      organizerFormShellRef.current?.openCreateEvent();
    });
  };

  const onSubmitDealClick = () => {
    if (!canPostDeals) {
      navigate("/deals");
      return;
    }
    if (String(dealerStatus || "").toLowerCase() !== "approved") {
      openDealerOnboardingModal();
      return;
    }
    setDealSubmitError("");
    setDealSubmitForm({ ...emptyDealSubmitForm });
    setDealSubmitOpen(true);
  };

  const openInfluencerSpotlightModal = () => {
    if (infStatusLower === "pending") {
      return;
    }
    setProfileError("");
    setProfileMessage("");
    setProfileForm((s) => ({ ...s, wants_influencer: true }));
    setCreatorModal("influencer");
  };

  const toNumberOrUndefined = (value) => {
    if (value === "" || value === null || value === undefined) {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const persistInfluencerFromModal = async () => {
    if (isInfluencerPending) {
      setProfileError("Your creator profile is awaiting review. You can edit after a decision.");
      return;
    }
    setProfileError("");
    setProfileMessage("");
    try {
      setSavingProfile(true);
      const response = await updateMyProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        mobile_number: profileForm.mobile_number,
        city_id: toNumberOrUndefined(profileForm.city_id),
        interests: profileForm.interests,
        wants_influencer: true,
        wants_deal: profileForm.wants_deal,
        influencer_profile: {
          ...influencerProfile,
          category_id: toNumberOrUndefined(influencerProfile.category_id)
        },
        deal_profile: profileForm.wants_deal
          ? { ...dealProfile, category_id: toNumberOrUndefined(dealProfile.category_id) }
          : undefined
      });
      const latestProfile = response?.data || null;
      setProfile(latestProfile);
      if (latestProfile && accessToken) {
        login({ accessToken, refreshToken, user: latestProfile });
      }
      setProfileMessage(response?.message || "Creator profile saved.");
      setCreatorModal(null);
      const influencerResult = await fetchMyInfluencerSubmissions();
      setMyInfluencerSubmissions(influencerResult?.data || []);
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Could not save creator profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  const openDealerOnboardingModal = () => {
    setProfileError("");
    setProfileMessage("");
    setProfileForm((s) => ({ ...s, wants_deal: true }));
    setCreatorModal("dealer");
  };

  const persistDealerFromModal = async () => {
    if (isDealerPending) {
      setProfileError("Your dealer profile is awaiting review. You can edit after a decision.");
      return;
    }
    setProfileError("");
    setProfileMessage("");
    try {
      setSavingProfile(true);
      const response = await updateMyProfile({
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        email: profileForm.email,
        mobile_number: profileForm.mobile_number,
        city_id: toNumberOrUndefined(profileForm.city_id),
        interests: profileForm.interests,
        wants_influencer: profileForm.wants_influencer,
        wants_deal: true,
        influencer_profile: profileForm.wants_influencer
          ? {
              ...influencerProfile,
              category_id: toNumberOrUndefined(influencerProfile.category_id)
            }
          : undefined,
        deal_profile: {
          ...dealProfile,
          category_id: toNumberOrUndefined(dealProfile.category_id)
        }
      });
      const latestProfile = response?.data || null;
      setProfile(latestProfile);
      if (latestProfile && accessToken) {
        login({ accessToken, refreshToken, user: latestProfile });
      }
      setProfileMessage(response?.message || "Business profile saved.");
      setCreatorModal(null);
    } catch (err) {
      setProfileError(err?.response?.data?.message || "Could not save business profile.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Mobile + Tablet layout (does not affect desktop). */}
      <div className="lg:hidden space-y-4">
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-3.5 text-white shadow-soft sm:rounded-3xl sm:p-4">
          <div className="flex items-start justify-between gap-2.5 sm:gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <div className="min-w-0 flex-1">
                <div className="min-w-0">
                  <YayUserGreeting
                    name={profile?.name || user?.name || "User"}
                    variant="dark"
                    size="sm"
                    className="min-w-0 max-w-full truncate"
                  />
                </div>
                <p className="truncate text-[11px] leading-tight text-white/70 sm:text-xs">{profile?.email || user?.email}</p>
                <p className="truncate text-[11px] leading-tight text-white/55 sm:text-xs">{profile?.mobile_number || "Add mobile number"}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setPasswordError("");
                  setPasswordMessage("");
                  setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                  setShowPasswordModal(true);
                }}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/[0.12] px-2 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.97]"
                title={isGoogleFirstPassword ? "Set your password" : "Change password"}
              >
                <FiKey className="h-3.5 w-3.5" aria-hidden />
                <span>{isGoogleFirstPassword ? "Set" : "Password"}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileError("");
                  setProfileMessage("");
                  setProfileEditorTab("basic");
                  setShowProfileEditor(true);
                }}
                className="inline-flex h-9 items-center justify-center gap-1 rounded-xl border border-white/20 bg-white/[0.12] px-2 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm ring-1 ring-white/10 backdrop-blur-sm transition active:scale-[0.97]"
              >
                <FiEdit2 className="h-3.5 w-3.5" aria-hidden />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {profileMessage ? <p className="mt-3 text-sm font-medium text-emerald-200">{profileMessage}</p> : null}
          {profileError ? <p className="mt-2 text-sm font-medium text-rose-200">{profileError}</p> : null}

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={enablingOrganizer}
              onClick={() => void onPostEventClick()}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
            >
              Post an event
            </button>
            <button
              type="button"
              onClick={onSubmitDealClick}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15"
            >
              Submit a deal
            </button>
            <button
              type="button"
              onClick={() => void openDealerOnboardingModal()}
              disabled={businessProfileCta.disabled}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
            >
              {hasRegisteredDealer ? "Edit business profile" : "Business profile"}
            </button>
            <button
              type="button"
              onClick={openInfluencerSpotlightModal}
              disabled={infStatusLower === "pending"}
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
            >
              Edit creator spotlight
            </button>
          </div>
        </section>

        {organizerEnableError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {organizerEnableError}
          </p>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-3.5 shadow-soft">
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5">
            <button
              type="button"
              onClick={() => setMobileWorkspaceTab("events")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mobileWorkspaceTab === "events" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              Manage Events
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">{myEventsCount}</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileWorkspaceTab("offers")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                mobileWorkspaceTab === "offers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600"
              }`}
            >
              Offers & Spotlights
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                {myDealSubmissions.length + myInfluencerSubmissions.length}
              </span>
            </button>
          </div>
          <div className="mt-3">
            {mobileWorkspaceTab === "events" ? (
              <OrganizerDashboardPage embedded embeddedSectionMode="my-events-only" />
            ) : (
              <UserSubmissionsPanel variant="standalone" showBackToHub={false} />
            )}
          </div>
        </section>
      </div>

      {/* Desktop layout (unchanged). */}
      <div className="hidden lg:block space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your space</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
            <YayUserGreeting name={profile?.name || user?.name || "User"} variant="light" size="lg" />
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Your hub for plans you&apos;re attending. Hosting, deals, and creator tools stay tucked behind a single workspace so this page stays calm.
          </p>
        </div>
        <div className="shrink-0 space-y-2 lg:w-[300px]">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setPasswordError("");
                setPasswordMessage("");
                setPasswordForm({ current_password: "", new_password: "", confirm_password: "" });
                setShowPasswordModal(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              title={isGoogleFirstPassword ? "Set your password" : "Change password"}
            >
              <FiKey className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>{isGoogleFirstPassword ? "Set password" : "Password"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setProfileError("");
                setProfileMessage("");
                setProfileEditorTab("basic");
                setShowProfileEditor(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FiEdit2 className="h-3.5 w-3.5 shrink-0" />
              Edit
            </button>
          </div>
          <button
            type="button"
            onClick={openInfluencerSpotlightModal}
            disabled={infStatusLower === "pending"}
            className="w-full rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-yellow-50 to-white px-4 py-3 text-left shadow-sm ring-1 ring-amber-100 transition hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900/80">Creator spotlight</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{influencerSpotlightCta.label}</p>
            <p className="text-xs leading-snug text-slate-600">{influencerSpotlightCta.sub}</p>
          </button>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50/80 to-cyan-50/30 p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-600">Host &amp; promote</p>
        <h2 className="mt-1 text-lg font-bold text-slate-900">Posting &amp; management workspace</h2>
        <p className="mt-1 text-sm text-slate-600">
          Host events and check spotlight status — open the hub for shortcuts, or jump straight into your organizer tools.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={enablingOrganizer}
            onClick={() => void onPostEventClick()}
            className="inline-flex items-center justify-center rounded-xl border border-brand-400/80 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-brand-950 transition hover:bg-brand-100/90 disabled:opacity-60"
          >
            Post an event
          </button>
          <button
            type="button"
            onClick={onSubmitDealClick}
            className="inline-flex items-center justify-center rounded-xl border border-emerald-400/70 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100/90"
          >
            Submit a deal
          </button>
          <button
            type="button"
            onClick={() => void openDealerOnboardingModal()}
            disabled={businessProfileCta.disabled}
            title={businessProfileCta.sub || undefined}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-55"
          >
            {businessProfileCta.label}
          </button>
        </div>
      </section>

      {organizerEnableError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{organizerEnableError}</p>
      ) : null}

      {profileMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{profileMessage}</p> : null}
      {profileError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{profileError}</p> : null}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-1.5">
          <button
            type="button"
            onClick={() => setDesktopWorkspaceTab("events")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              desktopWorkspaceTab === "events" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Manage Events
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">{myEventsCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setDesktopWorkspaceTab("offers")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              desktopWorkspaceTab === "offers" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            Offers &amp; Creator Spotlights
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-700">
              {myDealSubmissions.length + myInfluencerSubmissions.length}
            </span>
          </button>
        </div>

        <div className="mt-4">
          {desktopWorkspaceTab === "events" ? (
            <OrganizerDashboardPage embedded embeddedSectionMode="my-events-only" />
          ) : (
            <UserSubmissionsPanel variant="standalone" showBackToHub={false} />
          )}
        </div>
      </section>
      </div>

      {showProfileEditor ? renderInPortal(
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-0 py-0 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-6 lg:items-center lg:justify-center lg:bg-slate-900/50 lg:px-6 lg:py-8 lg:backdrop-blur-none"
        >
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex max-h-[min(96dvh,100vh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.35rem] border border-b-0 border-slate-200/90 bg-white shadow-[0_-12px_48px_rgba(15,23,42,0.2)] sm:max-h-[min(90vh,720px)] sm:rounded-3xl sm:border sm:shadow-xl lg:h-[min(74vh,620px)] lg:max-h-[min(74vh,620px)] lg:rounded-3xl lg:border-slate-200 lg:shadow-xl"
          >
            <div className="shrink-0 border-b border-slate-200 px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4 lg:px-6 lg:pt-5">
              <div
                className="mx-auto mb-2 h-1 w-10 rounded-full bg-slate-200/90 lg:hidden"
                aria-hidden
              />
              <div className="mb-2.5 flex items-start justify-between gap-2 sm:mb-3 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold tracking-tight text-slate-900 sm:text-lg lg:text-lg">Edit profile</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:text-sm">
                    <span className="hidden lg:inline">Keep your account details updated for a smoother experience.</span>
                    <span className="lg:hidden">Update your details below.</span>
                  </p>
                {dealerStatus ? (
                  <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:text-xs">
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
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 sm:px-3 sm:py-1 sm:text-xs">
                  {currentTabIndex + 1}/{profileTabs.length}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 sm:h-2">
                <motion.div
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="h-full rounded-full bg-slate-900"
                />
              </div>
            </div>
            <div className="shrink-0 border-b border-slate-200 px-4 py-2.5 sm:px-5 sm:py-3 lg:px-6">
              <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 sm:rounded-xl sm:p-1">
              {profileTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setProfileEditorTab(tab.key)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition sm:rounded-lg sm:px-3 sm:py-2 sm:text-xs ${
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
                className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain px-4 py-3 sm:space-y-3 sm:px-5 sm:py-4 lg:px-6"
              >
                {profileEditorTab === "basic" ? (
                  <>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                      <input
                        type="text"
                        required
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm((s) => ({ ...s, first_name: e.target.value }))}
                        placeholder="First name"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] leading-snug placeholder:text-slate-400 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm lg:rounded-xl"
                      />
                      <input
                        type="text"
                        required
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm((s) => ({ ...s, last_name: e.target.value }))}
                        placeholder="Last name"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] leading-snug placeholder:text-slate-400 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm lg:rounded-xl"
                      />
                    </div>
                    <input
                      type="email"
                      required
                      value={profileForm.email}
                      onChange={(e) => setProfileForm((s) => ({ ...s, email: e.target.value }))}
                      placeholder="Email"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] leading-snug placeholder:text-slate-400 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm lg:rounded-xl"
                    />
                    <input
                      type="text"
                      value={profileForm.mobile_number}
                      onChange={(e) => setProfileForm((s) => ({ ...s, mobile_number: e.target.value }))}
                      placeholder="Mobile number"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] leading-snug placeholder:text-slate-400 sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm lg:rounded-xl"
                    />
                    <select
                      required
                      value={profileForm.city_id}
                      onChange={(e) => setProfileForm((s) => ({ ...s, city_id: e.target.value }))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[13px] sm:rounded-xl sm:px-4 sm:py-2.5 sm:text-sm lg:rounded-xl"
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
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 sm:rounded-xl sm:p-3 lg:rounded-xl">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600 sm:mb-2 sm:text-xs">
                        Interested in
                      </p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
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
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold transition sm:px-3 sm:py-1 sm:text-xs ${
                                active ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200/80"
                              }`}
                            >
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                ) : null}
              </motion.div>
              <div className="border-t border-slate-200 bg-white/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm sm:px-5 sm:py-4 lg:px-6 lg:pb-4">
              {profileError ? (
                <p className="mb-2 text-xs font-medium text-rose-600 sm:mb-3 sm:text-sm">{profileError}</p>
              ) : null}
              <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-2">
                <div className="flex items-center justify-center gap-1.5 sm:justify-start sm:gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentTabIndex > 0) {
                        setProfileEditorTab(profileTabs[currentTabIndex - 1].key);
                      }
                    }}
                    disabled={currentTabIndex === 0}
                    className="min-h-[40px] flex-1 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40 sm:min-h-0 sm:flex-initial sm:px-4 sm:py-2 sm:text-sm"
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
                    className="min-h-[40px] flex-1 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40 sm:min-h-0 sm:flex-initial sm:px-4 sm:py-2 sm:text-sm"
                  >
                    Next
                  </button>
                </div>
                <div className="flex items-center justify-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowProfileEditor(false)}
                  className="min-h-[40px] flex-1 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 sm:min-h-0 sm:flex-initial sm:px-4 sm:py-2 sm:text-sm"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="min-h-[40px] flex-[1.15] rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 sm:min-h-0 sm:flex-initial sm:px-4 sm:py-2 sm:text-sm"
                >
                  {savingProfile ? (
                    "Saving…"
                  ) : (
                    <>
                      <span className="lg:hidden">Save</span>
                      <span className="hidden lg:inline">Save changes</span>
                    </>
                  )}
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

      {creatorModal === "dealer"
        ? renderInPortal(
            <div className="fixed inset-0 z-[205] flex items-center justify-center bg-slate-900/55 px-3 py-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex h-[min(76vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <h3 className="text-lg font-semibold">
                    {hasRegisteredDealer ? "Dealer profile" : "Register your business"}
                  </h3>
                  <p className="mb-4 text-sm text-slate-600">
                    {hasRegisteredDealer
                      ? "Keep your dealer profile updated for admin moderation."
                      : "Tell us about your business. You can post offers after approval."}
                  </p>
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
                    <FormField label="Profile image / logo" hint="Upload your business logo or profile image.">
                      <CloudinaryImageInput
                        value={dealProfile.profile_image_url}
                        onChange={(url) => setDealProfile((s) => ({ ...s, profile_image_url: url }))}
                        disabled={savingProfile}
                      />
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
                      setCreatorModal(null);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void persistDealerFromModal()}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingProfile ? "Saving…" : "Save & sync profile"}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        : null}

      {creatorModal === "influencer"
        ? renderInPortal(
            <div className="fixed inset-0 z-[205] flex items-center justify-center bg-slate-900/55 px-3 py-4 sm:px-6">
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
                    <FormField label="Facebook Page URL" hint="Use facebook.com/page_name format." example="https://facebook.com/page_name">
                      <input
                        type="url"
                        value={influencerProfile.facebook || ""}
                        onChange={(e) => setInfluencerProfile((s) => ({ ...s, facebook: e.target.value }))}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      />
                    </FormField>
                    <FormField label="YouTube URL" hint="Paste your channel or profile link." example="https://youtube.com/@yourchannel">
                      <input type="url" value={influencerProfile.youtube} onChange={(e) => setInfluencerProfile((s) => ({ ...s, youtube: e.target.value }))} className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
                    </FormField>
                    <div className="sm:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
                      Use public links in these formats: instagram.com/user_name and facebook.com/page_name. Private accounts/pages can
                      render empty embeds.
                    </div>
                    <FormField label="Profile image" hint="Upload a high-quality profile photo.">
                      <CloudinaryImageInput
                        value={influencerProfile.profile_image_url}
                        onChange={(url) => setInfluencerProfile((s) => ({ ...s, profile_image_url: url }))}
                        disabled={savingProfile}
                      />
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
                      setCreatorModal(null);
                    }}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={() => void persistInfluencerFromModal()}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {savingProfile ? "Saving…" : "Save & sync profile"}
                  </button>
                </div>
              </motion.div>
            </div>
          )
        : null}

      {creatorHubOpen
        ? renderInPortal(
            <div
              className="fixed inset-0 z-[196] flex items-center justify-center bg-slate-950/55 px-4 py-8"
              onClick={() => setCreatorHubOpen(false)}
              role="presentation"
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl"
              >
                <h3 className="text-lg font-bold text-slate-900">Hosting workspace</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Jump into events and submission status — your dashboard stays clean.
                </p>
                <div className="mt-5 space-y-3">
                  <button
                    type="button"
                    disabled={enablingOrganizer}
                    onClick={() => {
                      setCreatorHubOpen(false);
                      void onListExperienceClick();
                    }}
                    className="flex w-full flex-col rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-left transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700">Events</span>
                    <span className="mt-1 font-semibold text-slate-900">Host &amp; manage experiences</span>
                    <span className="mt-0.5 text-xs text-slate-600">Listings, tickets, bookings — full organizer tools.</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreatorHubOpen(false);
                      navigate("/dashboard/user/submissions");
                    }}
                    className="flex w-full flex-col rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:bg-slate-50"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-slate-600">Status</span>
                    <span className="mt-1 font-semibold text-slate-900">Spotlights &amp; submitted offers</span>
                    <span className="mt-0.5 text-xs text-slate-600">See what&apos;s live, pending, or needs edits.</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatorHubOpen(false)}
                  className="mt-5 w-full rounded-xl border border-slate-300 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Close
                </button>
              </motion.div>
            </div>
          )
        : null}

      {renderInPortal(
        <AnimatePresence>
          {showHostingWorkspaceLoading ? (
            <AppLoadingOverlay
              key="hosting-workspace-loading"
              ariaLabel="Loading hosting workspace"
              caption="Loading your workspace"
              zIndexClass="z-[220]"
            />
          ) : null}
        </AnimatePresence>
      )}

      {eventsWorkspaceOpen
        ? renderInPortal(
            <div className="fixed inset-0 z-[198] flex flex-col bg-slate-50">
              <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Host &amp; manage events</h2>
                  {canOrganize ? (
                    <p className="text-xs font-semibold text-emerald-700">Hosting enabled</p>
                  ) : (
                    <p className="text-xs text-slate-600">We&apos;ll enable hosting on first open if needed.</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEventsWorkspaceOpen(false)}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Close
                </button>
              </header>
              <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
                <OrganizerDashboardPage embedded onEmbeddedWorkspaceInitialReady={handleOrganizerWorkspaceInitialReady} />
              </div>
            </div>
          )
        : null}

      <div hidden aria-hidden="true" data-route-splash-ignore>
        <OrganizerDashboardPage
          ref={organizerFormShellRef}
          embedded
          suppressChrome
          suppressRouteContentReadySignal
        />
      </div>

      <DealSubmissionModal
        open={dealSubmitOpen}
        title="Submit Deal"
        onClose={() => setDealSubmitOpen(false)}
        submitLoading={dealSubmitLoading}
        submitError={dealSubmitError}
        cities={cities}
        form={dealSubmitForm}
        setForm={setDealSubmitForm}
        onSubmit={async (e) => {
          e.preventDefault();
          setDealSubmitError("");
          try {
            setDealSubmitLoading(true);
            await createDeal({
              ...dealSubmitForm,
              city_id: Number(dealSubmitForm.city_id),
              category_id: Number(dealSubmitForm.category_id),
              promo_code: dealSubmitForm.promo_code?.trim() || undefined,
              deal_link: dealSubmitForm.deal_link?.trim() || undefined,
              image_url: dealSubmitForm.image_url?.trim() || undefined,
              terms_text: dealSubmitForm.deal_info?.trim() || undefined
            });
            setDealSubmitOpen(false);
            setDealSubmitForm({ ...emptyDealSubmitForm });
            setProfileMessage("Deal submitted. It will be visible after admin approval.");
            try {
              const dealResult = await fetchMyDealSubmissions();
              setMyDealSubmissions(dealResult?.data || []);
            } catch (_err) {
              /* ignore refresh failure */
            }
          } catch (err) {
            setDealSubmitError(err?.response?.data?.message || "Could not submit deal.");
          } finally {
            setDealSubmitLoading(false);
          }
        }}
      />

    </motion.div>
  );
}

export default UserDashboardPage;
