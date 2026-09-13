import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { FiEdit2, FiInfo, FiKey, FiUser } from "react-icons/fi";
import useFavorites from "../hooks/useFavorites";
import useAuth from "../hooks/useAuth";
import BrandUserGreeting from "../components/BrandUserGreeting";
import { fetchMyBookings } from "../services/bookingService";
import { createDeal, fetchMyDealSubmissions, fetchMyInfluencerSubmissions } from "../services/listingService";
import DealSubmissionModal, { emptyDealSubmitForm } from "../components/DealSubmissionModal";
import { refreshAccessToken, requestPasswordReset } from "../services/authService";
import { changeMyPassword, enableOrganizer, fetchMyProfile, updateMyProfile } from "../services/userService";
import { categories } from "../utils/filterOptions";
import { parseInfluencerSocialLinks } from "../utils/influencerSocial";
import useCityFilter from "../hooks/useCityFilter";
import { useRouteContentReady } from "../context/RouteContentReadyContext";
import AppLoadingOverlay from "../components/AppLoadingOverlay";
import OrganizerDashboardPage from "./OrganizerDashboardPage";
import CloudinaryImageInput from "../components/CloudinaryImageInput";
import UserSubmissionsPanel from "../components/UserSubmissionsPanel";
import PostSubmitFeedbackDialog from "../components/PostSubmitFeedbackDialog";
import { fetchMyEvents } from "../services/eventService";
import UserDashboardBookingsAndFavorites from "../components/UserDashboardBookingsAndFavorites";
import PlatformTicketAccessRequestModal from "../components/PlatformTicketAccessRequestModal";
import WorkspaceTabSwitchLoader from "../components/WorkspaceTabSwitchLoader";
import { acceptAnalyticsInvite } from "../services/organizerAnalyticsService";
import { profileMobileOrEmpty } from "../utils/phone";

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

const HOST_TAB_KEYS = new Set([
  "overview",
  "shared",
  "events",
  "coupons",
  "vendor-codes",
  "check-in",
  "offers"
]);

const ORGANIZER_SECTION_BY_TAB = {
  overview: "overview",
  shared: "shared",
  events: "my-events",
  coupons: "coupons",
  "vendor-codes": "vendor-codes",
  "check-in": "check-in"
};

const ORGANIZER_WORKSPACE_TABS = [
  { key: "overview", label: "Overview" },
  { key: "shared", label: "Shared with me", shortLabel: "Shared" },
  { key: "events", label: "My Events" },
  { key: "coupons", label: "Coupons" },
  { key: "vendor-codes", label: "Vendor codes", shortLabel: "Vendors" },
  { key: "check-in", label: "Check In", shortLabel: "Check In" },
  { key: "offers", label: "Offers & Creator Spotlights", shortLabel: "Offers & Spotlights" }
];

const DEFAULT_WORKSPACE_TABS = [
  { key: "events", label: "Manage Events" },
  { key: "offers", label: "Offers & Creator Spotlights", shortLabel: "Offers & Spotlights" }
];

function tabFromSearch(search) {
  const params = new URLSearchParams(search || "");
  if (params.get("invite")) {
    return "shared";
  }
  const host = String(params.get("host") || params.get("section") || "").toLowerCase();
  if (host === "my-events") {
    return "events";
  }
  if (HOST_TAB_KEYS.has(host)) {
    return host;
  }
  return "";
}

function HostWorkspaceTabBar({ tabs, active, onChange, counts, compact }) {
  const pillId = compact ? "host-tab-pill-mobile" : "host-tab-pill-desktop";
  return (
    <div className="flex items-center gap-2 overflow-x-auto rounded-xl bg-slate-50 p-1.5">
      {tabs.map((tab) => {
        const selected = active === tab.key;
        const label = compact && tab.shortLabel ? tab.shortLabel : tab.label;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`relative inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
              selected ? "text-slate-900" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            {selected ? (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-lg bg-white shadow-sm"
                transition={{ type: "spring", stiffness: 420, damping: 34, mass: 0.7 }}
              />
            ) : null}
            <span className="relative z-[1]">{label}</span>
            {tab.key === "events" ? (
              <span className="relative z-[1] rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                {counts.events}
              </span>
            ) : null}
            {tab.key === "offers" ? (
              <span className="relative z-[1] rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                {counts.offers}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function HostWorkspacePanel({
  layout,
  tabs,
  activeTab,
  onTabChange,
  myEventsCount,
  offersCount,
  onRequestPlatformTickets,
  onAfterResubmitSuccess
}) {
  const organizerSection = ORGANIZER_SECTION_BY_TAB[activeTab];
  const showOffers = activeTab === "offers";
  const [tabSwitching, setTabSwitching] = useState(false);
  const prevTabRef = useRef(activeTab);
  const switchTimersRef = useRef({ hide: 0, safety: 0, raf: 0 });

  const handleTabChange = useCallback(
    (tab) => {
      if (tab === activeTab) {
        return;
      }
      setTabSwitching(true);
      onTabChange(tab);
    },
    [activeTab, onTabChange]
  );

  useEffect(() => {
    if (prevTabRef.current === activeTab) {
      return undefined;
    }
    prevTabRef.current = activeTab;
    setTabSwitching(true);

    const timers = switchTimersRef.current;
    window.clearTimeout(timers.hide);
    window.clearTimeout(timers.safety);
    if (timers.raf) {
      window.cancelAnimationFrame(timers.raf);
    }

    let cancelled = false;
    const started = Date.now();
    const MIN_MS = 480;
    const MAX_MS = 2600;

    timers.raf = window.requestAnimationFrame(() => {
      timers.raf = window.requestAnimationFrame(() => {
        if (cancelled) {
          return;
        }
        const wait = Math.max(320, MIN_MS - (Date.now() - started));
        timers.hide = window.setTimeout(() => {
          if (!cancelled) {
            setTabSwitching(false);
          }
        }, wait);
      });
    });

    timers.safety = window.setTimeout(() => {
      if (!cancelled) {
        setTabSwitching(false);
      }
    }, MAX_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timers.hide);
      window.clearTimeout(timers.safety);
      if (timers.raf) {
        window.cancelAnimationFrame(timers.raf);
      }
    };
  }, [activeTab]);

  return (
    <section
      data-host-workspace={layout}
      className={`scroll-mt-24 border border-slate-200 bg-white shadow-soft sm:scroll-mt-28 ${
        layout === "mobile" ? "rounded-3xl p-3.5" : "rounded-2xl p-4"
      }`}
    >
      <HostWorkspaceTabBar
        tabs={tabs}
        active={activeTab}
        onChange={handleTabChange}
        counts={{ events: myEventsCount, offers: offersCount }}
        compact={layout === "mobile"}
      />
      <div className={`relative ${layout === "mobile" ? "mt-3 min-h-[12rem]" : "mt-4 min-h-[14rem]"}`}>
        <WorkspaceTabSwitchLoader show={tabSwitching} label="Loading" />
        {/* Keep both trees mounted so tab switches do not remount/refetch. */}
        <div
          className={`transition-opacity duration-300 ease-out ${
            tabSwitching ? "opacity-40" : "opacity-100"
          } ${showOffers ? "hidden" : "block"}`}
          aria-hidden={showOffers}
        >
          <OrganizerDashboardPage
            embedded
            forcedSection={organizerSection || "my-events"}
            embeddedSectionMode="full"
            onRequestPlatformTickets={onRequestPlatformTickets}
          />
        </div>
        <div
          className={`transition-opacity duration-300 ease-out ${
            tabSwitching ? "opacity-40" : "opacity-100"
          } ${showOffers ? "block" : "hidden"}`}
          aria-hidden={!showOffers}
        >
          <UserSubmissionsPanel
            variant="standalone"
            showBackToHub={false}
            onAfterResubmitSuccess={onAfterResubmitSuccess}
          />
        </div>
      </div>
    </section>
  );
}

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

function UserDashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { cities } = useCityFilter();
  const {
    user,
    accessToken,
    refreshToken,
    login,
    canPostDeals,
    canSellPlatformTickets,
    refreshSession
  } = useAuth();
  const [platformTicketRequestOpen, setPlatformTicketRequestOpen] = useState(false);
  const { favorites, loading: favoritesLoading, toggleFavorite } = useFavorites();
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [bookingsError, setBookingsError] = useState("");
  const [bookingFilter, setBookingFilter] = useState("upcoming");
  const canOrganizeEarly = Number(user?.organizer_enabled) === 1;
  const initialHostTab = tabFromSearch(location.search) || (canOrganizeEarly ? "overview" : "events");
  const [desktopWorkspaceTab, setDesktopWorkspaceTab] = useState(initialHostTab);
  const [mobileWorkspaceTab, setMobileWorkspaceTab] = useState(initialHostTab);
  const [myEventsCount, setMyEventsCount] = useState(0);
  const [enablingOrganizer, setEnablingOrganizer] = useState(false);
  const [organizerEnableError, setOrganizerEnableError] = useState("");
  const [inviteNotice, setInviteNotice] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [myInfluencerSubmissions, setMyInfluencerSubmissions] = useState([]);
  const [myDealSubmissions, setMyDealSubmissions] = useState([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);
  const [submissionsError, setSubmissionsError] = useState("");
  const [profile, setProfile] = useState(user || null);
  const [showProfileEditor, setShowProfileEditor] = useState(false);
  const [creatorModal, setCreatorModal] = useState(null);
  const [creatorHubOpen, setCreatorHubOpen] = useState(false);
  const [submissionSuccessDialog, setSubmissionSuccessDialog] = useState(null);
  const organizerFormShellRef = useRef(null);
  const inviteHandledRef = useRef("");
  const [profileEditorTab, setProfileEditorTab] = useState("basic");
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    email: user?.email || "",
    mobile_number: profileMobileOrEmpty(user?.mobile_number),
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
  const [passwordResetSending, setPasswordResetSending] = useState(false);
  const [dealSubmitOpen, setDealSubmitOpen] = useState(false);
  const [dealSubmitLoading, setDealSubmitLoading] = useState(false);
  const [dealSubmitError, setDealSubmitError] = useState("");
  const [dealSubmitForm, setDealSubmitForm] = useState(() => ({ ...emptyDealSubmitForm }));
  const canOrganize = Number(user?.organizer_enabled) === 1;
  const workspaceTabs = canOrganize ? ORGANIZER_WORKSPACE_TABS : DEFAULT_WORKSPACE_TABS;
  const offersCount = myDealSubmissions.length + myInfluencerSubmissions.length;
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
      sub: "Tell us about you — get spotlighted on Book My Tickets"
    };
  }, [infStatusLower, myInfluencerSubmissions.length, hasInfluencerDetails]);

  const isGoogleUser = useMemo(
    () => String(profile?.auth_provider || user?.auth_provider || "").toLowerCase() === "google",
    [profile?.auth_provider, user?.auth_provider]
  );
  /** Google: no local password yet — “Set” copy; otherwise still no current-password field */
  const isGoogleFirstPassword = isGoogleUser && profile?.has_local_password !== true;

  useRouteContentReady(loadingBookings || loadingSubmissions || favoritesLoading);

  useEffect(() => {
    if (showProfileEditor && profileTabs.every((t) => t.key !== profileEditorTab)) {
      setProfileEditorTab("basic");
    }
  }, [showProfileEditor, profileEditorTab]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }
    setProfile((prev) => ({
      ...(prev || {}),
      ...user,
      dealer_profile: user.dealer_profile ?? prev?.dealer_profile ?? null,
      onboarding: user.onboarding ?? prev?.onboarding ?? null
    }));
    const onboarding = user?.onboarding || {};
    const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
    setProfileForm((prev) => ({
      ...prev,
      first_name: onboarding.first_name || parts.slice(0, -1).join(" ") || parts[0] || "",
      last_name: onboarding.last_name || (parts.length > 1 ? parts[parts.length - 1] : ""),
      email: user?.email || "",
      mobile_number: profileMobileOrEmpty(onboarding.mobile_number || user?.mobile_number),
      city_id: onboarding.city_id ? String(onboarding.city_id) : "",
      interests: Array.isArray(onboarding.interests) ? onboarding.interests : [],
      wants_influencer: Boolean(onboarding.wants_influencer),
      wants_deal: Boolean(onboarding.wants_deal) || Boolean(user.dealer_profile)
    }));
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
            mobile_number: profileMobileOrEmpty(onboarding.mobile_number || response.data.mobile_number),
            city_id: onboarding.city_id ? String(onboarding.city_id) : "",
            interests: Array.isArray(onboarding.interests) ? onboarding.interests : [],
            wants_influencer: Boolean(onboarding.wants_influencer),
            wants_deal: Boolean(onboarding.wants_deal) || Boolean(response.data.dealer_profile)
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
  }, [showProfileEditor, showPasswordModal, creatorHubOpen, creatorModal]);

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

  const openPlatformTicketRequestModal = useCallback(() => {
    setPlatformTicketRequestOpen(true);
  }, []);

  useEffect(() => {
    if (location.pathname !== "/dashboard/user") {
      return;
    }
    if (location.state?.openPlatformTicketRequest || location.hash === "#platform-ticket-request") {
      setPlatformTicketRequestOpen(true);
      if (location.state?.openPlatformTicketRequest) {
        navigate(location.pathname + location.hash, { replace: true, state: {} });
      }
    }
  }, [location.hash, location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }
    void refreshSession();
    if (canSellPlatformTickets) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void refreshSession();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [accessToken, canSellPlatformTickets, refreshSession]);

  useEffect(() => {
    if (location.pathname !== "/dashboard/user" || location.hash !== "#host-events") {
      return undefined;
    }
    const scrollToHostWorkspace = () => {
      const desktop = document.querySelector('[data-host-workspace="desktop"]');
      const mobile = document.querySelector('[data-host-workspace="mobile"]');
      const wide = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;
      const el = wide ? desktop : mobile;
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const id = window.requestAnimationFrame(() => {
      scrollToHostWorkspace();
    });
    return () => window.cancelAnimationFrame(id);
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

  const showHostingWorkspaceLoading = enablingOrganizer;

  const setWorkspaceTab = useCallback((tab) => {
    setDesktopWorkspaceTab(tab);
    setMobileWorkspaceTab(tab);
    const next = new URLSearchParams(location.search);
    next.delete("section");
    if (tab === "overview") {
      next.delete("host");
    } else {
      next.set("host", tab);
    }
    const qs = next.toString();
    navigate(
      { pathname: location.pathname, search: qs ? `?${qs}` : "", hash: location.hash },
      { replace: true }
    );
  }, [location.hash, location.pathname, location.search, navigate]);

  const scrollToHostWorkspace = useCallback(() => {
    const desktop = document.querySelector('[data-host-workspace="desktop"]');
    const mobile = document.querySelector('[data-host-workspace="mobile"]');
    const wide = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 1024px)").matches;
    const el = wide ? desktop : mobile;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    const fromSearch = tabFromSearch(location.search);
    if (fromSearch) {
      setDesktopWorkspaceTab(fromSearch);
      setMobileWorkspaceTab(fromSearch);
    }
  }, [location.search]);

  useEffect(() => {
    const token = String(new URLSearchParams(location.search).get("invite") || "").trim();
    if (!token || inviteHandledRef.current === token) {
      return undefined;
    }
    inviteHandledRef.current = token;
    let cancelled = false;
    (async () => {
      setInviteError("");
      setInviteNotice("Accepting invitation…");
      setDesktopWorkspaceTab("shared");
      setMobileWorkspaceTab("shared");
      try {
        const res = await acceptAnalyticsInvite(token);
        if (cancelled) {
          return;
        }
        const acceptedUser = res?.data?.user;
        if (acceptedUser) {
          const access = localStorage.getItem("accessToken");
          const refreshTok = localStorage.getItem("refreshToken");
          if (access && refreshTok && typeof login === "function") {
            login({
              accessToken: access,
              refreshToken: refreshTok,
              user: {
                ...(user || {}),
                ...acceptedUser,
                organizer_enabled: 1
              }
            });
          }
        } else {
          try {
            await refreshSession();
          } catch (_err) {
            /* session refresh is best-effort; invite accept already succeeded */
          }
        }
        const eventId = String(res?.data?.event_id || "").trim();
        setInviteNotice(res?.message || "Invitation accepted.");
        const next = new URLSearchParams(location.search);
        next.delete("invite");
        next.set("host", "shared");
        next.delete("section");
        if (eventId) {
          next.set("eventId", eventId);
        }
        navigate(
          { pathname: location.pathname, search: `?${next.toString()}`, hash: location.hash },
          { replace: true }
        );
      } catch (err) {
        if (cancelled) {
          return;
        }
        setInviteNotice("");
        setInviteError(err?.response?.data?.message || "Could not accept this invitation.");
        const next = new URLSearchParams(location.search);
        next.delete("invite");
        next.set("host", "shared");
        navigate(
          { pathname: location.pathname, search: `?${next.toString()}`, hash: location.hash },
          { replace: true }
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search, login, navigate, refreshSession, user]);

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
    setWorkspaceTab("events");
    requestAnimationFrame(() => {
      scrollToHostWorkspace();
    });
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
    if (isDealerPending) {
      setProfileError("Your business profile is in review. You can submit deals after admin approval.");
      openDealerOnboardingModal();
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

  const handleListingResubmitSaved = useCallback((kind) => {
    if (kind === "influencer") {
      setSubmissionSuccessDialog({
        title: "Influencer submission updated",
        description: "Your changes were saved and sent for admin review."
      });
      return;
    }
    setSubmissionSuccessDialog({
      title: "Deal submission updated",
      description: "Your changes were saved and sent for admin review."
    });
  }, []);

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
      setCreatorModal(null);
      setSubmissionSuccessDialog({
        title: "Creator spotlight saved",
        description: "Your creator profile was submitted successfully. It will be visible after admin approval."
      });
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
                  <BrandUserGreeting
                    name={profile?.name || user?.name || "User"}
                    variant="dark"
                    size="sm"
                    className="min-w-0 max-w-full truncate"
                  />
                </div>
                <p className="truncate text-[11px] leading-tight text-white/70 sm:text-xs">{profile?.email || user?.email}</p>
                <p className="truncate text-[11px] leading-tight text-white/55 sm:text-xs">{profileMobileOrEmpty(profile?.mobile_number) || "Add mobile number"}</p>
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
            <button
              type="button"
              onClick={openPlatformTicketRequestModal}
              className={`col-span-2 rounded-xl border px-3 py-2 text-xs font-semibold text-white ring-1 transition ${
                canSellPlatformTickets
                  ? "border-emerald-300/40 bg-emerald-500/25 ring-emerald-400/30 hover:bg-emerald-500/35"
                  : "border-violet-300/40 bg-violet-500/25 ring-violet-400/30 hover:bg-violet-500/35"
              }`}
            >
              {canSellPlatformTickets ? "On-site tickets · enabled" : "Host tickets on-site"}
            </button>
          </div>
        </section>

        {organizerEnableError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {organizerEnableError}
          </p>
        ) : null}
        {inviteNotice ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {inviteNotice}
          </p>
        ) : null}
        {inviteError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {inviteError}
          </p>
        ) : null}

        {canOrganize ? (
          <HostWorkspacePanel
            layout="mobile"
            tabs={workspaceTabs}
            activeTab={mobileWorkspaceTab}
            onTabChange={setWorkspaceTab}
            myEventsCount={myEventsCount}
            offersCount={offersCount}
            onRequestPlatformTickets={openPlatformTicketRequestModal}
            onAfterResubmitSuccess={handleListingResubmitSaved}
          />
        ) : null}

        <UserDashboardBookingsAndFavorites
          filteredBookings={filteredBookings}
          bookingsTotalCount={bookings.length}
          loadingBookings={loadingBookings}
          bookingsError={bookingsError}
          bookingFilter={bookingFilter}
          onBookingFilterChange={setBookingFilter}
          favorites={favorites}
          favoritesLoading={favoritesLoading}
          toggleFavorite={toggleFavorite}
        />

        {!canOrganize ? (
          <HostWorkspacePanel
            layout="mobile"
            tabs={workspaceTabs}
            activeTab={mobileWorkspaceTab}
            onTabChange={setWorkspaceTab}
            myEventsCount={myEventsCount}
            offersCount={offersCount}
            onRequestPlatformTickets={openPlatformTicketRequestModal}
            onAfterResubmitSuccess={handleListingResubmitSaved}
          />
        ) : null}
      </div>

      {/* Desktop layout (unchanged). */}
      <div className="hidden lg:block space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Your space</p>
          <h1 className="mt-1 text-2xl font-bold leading-tight text-slate-900">
            <BrandUserGreeting name={profile?.name || user?.name || "User"} variant="light" size="lg" />
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

      {canOrganize ? (
        <>
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
                onClick={openPlatformTicketRequestModal}
                className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  canSellPlatformTickets
                    ? "border-emerald-300/80 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/90"
                    : "border-violet-300/80 bg-violet-50 text-violet-950 hover:bg-violet-100/90"
                }`}
              >
                {canSellPlatformTickets ? "On-site tickets · enabled" : "Host tickets on-site"}
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
          {inviteNotice ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{inviteNotice}</p>
          ) : null}
          {inviteError ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{inviteError}</p>
          ) : null}
          {profileMessage ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{profileMessage}</p> : null}
          {profileError ? <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{profileError}</p> : null}

          <HostWorkspacePanel
            layout="desktop"
            tabs={workspaceTabs}
            activeTab={desktopWorkspaceTab}
            onTabChange={setWorkspaceTab}
            myEventsCount={myEventsCount}
            offersCount={offersCount}
            onRequestPlatformTickets={openPlatformTicketRequestModal}
            onAfterResubmitSuccess={handleListingResubmitSaved}
          />

          <UserDashboardBookingsAndFavorites
            filteredBookings={filteredBookings}
            bookingsTotalCount={bookings.length}
            loadingBookings={loadingBookings}
            bookingsError={bookingsError}
            bookingFilter={bookingFilter}
            onBookingFilterChange={setBookingFilter}
            favorites={favorites}
            favoritesLoading={favoritesLoading}
            toggleFavorite={toggleFavorite}
          />
        </>
      ) : (
        <>
          <UserDashboardBookingsAndFavorites
            filteredBookings={filteredBookings}
            bookingsTotalCount={bookings.length}
            loadingBookings={loadingBookings}
            bookingsError={bookingsError}
            bookingFilter={bookingFilter}
            onBookingFilterChange={setBookingFilter}
            favorites={favorites}
            favoritesLoading={favoritesLoading}
            toggleFavorite={toggleFavorite}
          />

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
                onClick={openPlatformTicketRequestModal}
                className={`inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
                  canSellPlatformTickets
                    ? "border-emerald-300/80 bg-emerald-50 text-emerald-950 hover:bg-emerald-100/90"
                    : "border-violet-300/80 bg-violet-50 text-violet-950 hover:bg-violet-100/90"
                }`}
              >
                {canSellPlatformTickets ? "On-site tickets · enabled" : "Host tickets on-site"}
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

          <HostWorkspacePanel
            layout="desktop"
            tabs={workspaceTabs}
            activeTab={desktopWorkspaceTab}
            onTabChange={setWorkspaceTab}
            myEventsCount={myEventsCount}
            offersCount={offersCount}
            onRequestPlatformTickets={openPlatformTicketRequestModal}
            onAfterResubmitSuccess={handleListingResubmitSaved}
          />
        </>
      )}
      </div>

      {renderInPortal(
        <AnimatePresence>
          {showProfileEditor ? (
        <motion.div
          key="profile-editor-shell"
          className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 px-0 py-0 backdrop-blur-[2px] sm:items-center sm:px-4 sm:py-6 lg:items-center lg:justify-center lg:bg-slate-900/50 lg:px-6 lg:py-8 lg:backdrop-blur-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.985 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
        </motion.div>
          ) : null}
        </AnimatePresence>
      )}

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
                    <>
                    <input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Current password"
                      value={passwordForm.current_password}
                      onChange={(e) => setPasswordForm((s) => ({ ...s, current_password: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                      required
                    />
                    <button
                      type="button"
                      disabled={passwordResetSending}
                      onClick={async () => {
                        const email = String(profile?.email || user?.email || "").trim();
                        if (!email) {
                          setPasswordError("Your profile needs an email before we can send a reset link.");
                          return;
                        }
                        setPasswordError("");
                        setPasswordMessage("");
                        try {
                          setPasswordResetSending(true);
                          const res = await requestPasswordReset(email);
                          setPasswordMessage(
                            res?.message ||
                              `If ${email} is registered, we sent a reset link. Check your inbox and spam folder.`
                          );
                        } catch (err) {
                          setPasswordError(
                            err?.response?.data?.message || "We couldn't send a reset email right now. Try again in a moment."
                          );
                        } finally {
                          setPasswordResetSending(false);
                        }
                      }}
                      className="text-left text-xs font-semibold text-brand-600 underline-offset-2 hover:underline disabled:opacity-60"
                    >
                      {passwordResetSending ? "Sending reset link…" : "Forgot password? Email me a reset link"}
                    </button>
                    </>
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

      {renderInPortal(
        <AnimatePresence>
          {creatorModal === "dealer" ? (
            <motion.div
              key="dealer-modal-shell"
              className="fixed inset-0 z-[205] flex items-center justify-center bg-slate-900/55 px-3 py-4 sm:px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.985 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="flex h-[min(76vh,640px)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl"
              >
                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
                  <h3 className="text-lg font-semibold">
                    {hasRegisteredDealer ? "Dealer profile" : "Register your business"}
                  </h3>
                  <p className="mb-4 text-sm text-slate-600">
                    {isDealerPending
                      ? "Your profile is awaiting admin review. You can review your details here but cannot change them until a decision is made."
                      : hasRegisteredDealer
                        ? "Keep your dealer profile updated for admin moderation."
                        : "Tell us about your business. You can post offers after approval."}
                  </p>
                  {isDealerPending ? (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      Status: <span className="font-semibold uppercase">pending review</span>
                    </div>
                  ) : null}
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
                      if (!hasRegisteredDealer && !hasDealerDetails) {
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
                    disabled={savingProfile || isDealerPending}
                    onClick={() => void persistDealerFromModal()}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isDealerPending ? "Awaiting review" : savingProfile ? "Saving…" : "Save & sync profile"}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {renderInPortal(
        <AnimatePresence>
          {creatorModal === "influencer" ? (
            <motion.div
              key="influencer-modal-shell"
              className="fixed inset-0 z-[205] flex items-center justify-center bg-slate-900/55 px-3 py-4 sm:px-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, y: 18, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.985 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

      {renderInPortal(
        <AnimatePresence>
          {creatorHubOpen ? (
            <motion.div
              key="creator-hub-shell"
              className="fixed inset-0 z-[196] flex items-center justify-center bg-slate-950/55 px-4 py-8"
              onClick={() => setCreatorHubOpen(false)}
              role="presentation"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                initial={{ opacity: 0, y: 16, scale: 0.985 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.985 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
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
            </motion.div>
          ) : null}
        </AnimatePresence>
      )}

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

      <div hidden aria-hidden="true" data-route-splash-ignore>
        <OrganizerDashboardPage
          ref={organizerFormShellRef}
          embedded
          suppressChrome
          suppressRouteContentReadySignal
          onRequestPlatformTickets={openPlatformTicketRequestModal}
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
            setSubmissionSuccessDialog({
              title: "Deal submitted",
              description: "Your deal was submitted successfully. It will appear after admin approval."
            });
          } catch (err) {
            setDealSubmitError(err?.response?.data?.message || "Could not submit deal.");
          } finally {
            setDealSubmitLoading(false);
          }
        }}
      />

      <PostSubmitFeedbackDialog
        open={submissionSuccessDialog != null}
        title={submissionSuccessDialog?.title ?? ""}
        description={submissionSuccessDialog?.description ?? ""}
      />

      <PlatformTicketAccessRequestModal
        open={platformTicketRequestOpen}
        onClose={() => setPlatformTicketRequestOpen(false)}
        user={user}
        onCapabilitiesUpdated={() => void refreshSession()}
        onSubmitted={() => {
          setSubmissionSuccessDialog({
            title: "Request sent",
            description:
              "We emailed your request to our team. You will hear back after an admin reviews it — check your inbox for updates."
          });
        }}
      />

    </motion.div>
  );
}

export default UserDashboardPage;
