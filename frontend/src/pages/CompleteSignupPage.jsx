import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { fetchMyProfile, updateMyProfile } from "../services/userService";
import { refreshAccessToken } from "../services/authService";
import AuthBrandLogo from "../components/AuthBrandLogo";
import RegistrationOnboardingForm from "../components/RegistrationOnboardingForm";
import { needsGoogleProfileCompletion } from "../utils/googleProfileCompletion";

const mobileRe = /^[0-9+()\-\s]+$/;

function safePath(p) {
  if (!p || typeof p !== "string" || !p.startsWith("/") || p.startsWith("//")) {
    return null;
  }
  return p;
}

export default function CompleteSignupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, refreshToken, user, logout } = useAuth();
  const initialEmail = user?.email || "";
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
  const [activeModal, setActiveModal] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

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

  useEffect(() => {
    let active = true;
    async function load() {
      setPageLoading(true);
      try {
        const res = await fetchMyProfile();
        if (!active) {
          return;
        }
        if (!res?.data) {
          navigate("/login", { replace: true });
          return;
        }
        if (!needsGoogleProfileCompletion(res)) {
          navigate("/dashboard/user", { replace: true });
          return;
        }
        const d = res.data;
        const onboarding = d.onboarding || {};
        const parts = String(d.name || "").trim().split(/\s+/).filter(Boolean);
        setForm({
          first_name: onboarding.first_name || parts.slice(0, -1).join(" ") || parts[0] || "",
          last_name: onboarding.last_name || (parts.length > 1 ? parts[parts.length - 1] : "") || "",
          email: d.email || initialEmail || "",
          mobile_number: onboarding.mobile_number || d.mobile_number || "",
          city_id: onboarding.city_id ? String(onboarding.city_id) : "",
          interests: Array.isArray(onboarding.interests) ? onboarding.interests : [],
          wants_influencer: Boolean(onboarding.wants_influencer),
          wants_deal: Boolean(onboarding.wants_deal),
          password: ""
        });
        if (d.dealer_profile) {
          const item = d.dealer_profile;
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
      } catch (_err) {
        if (active) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (active) {
          setPageLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.interests.length < 1) {
      setError("Select at least one interest.");
      return;
    }
    if (!mobileRe.test(String(form.mobile_number || "").trim()) || String(form.mobile_number || "").trim().length < 8) {
      setError("Enter a valid mobile number (at least 8 characters, digits and + - () spaces only).");
      return;
    }
    if (form.wants_influencer && !Number(influencerProfile.category_id)) {
      setError("Complete influencer details (including category) or turn off influencer signup.");
      setActiveModal("influencer");
      return;
    }
    if (form.wants_deal && (!Number(dealProfile.category_id) || !String(dealProfile.location_text || "").trim())) {
      setError("Complete dealer details (location and category) or turn off deal signup.");
      setActiveModal("deal");
      return;
    }
    try {
      setLoading(true);
      const payload = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        email: String(form.email || "").trim().toLowerCase(),
        mobile_number: form.mobile_number.trim(),
        city_id: Number(form.city_id),
        interests: form.interests,
        wants_influencer: form.wants_influencer,
        wants_deal: form.wants_deal,
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
      await updateMyProfile(payload);
      const rt = refreshToken || localStorage.getItem("refreshToken");
      if (rt) {
        const refreshed = await refreshAccessToken(rt);
        if (refreshed?.data?.accessToken && refreshed?.data?.user) {
          login(refreshed.data);
        }
      }
      const next = safePath(location.state?.next);
      navigate(next || "/dashboard/user", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="mx-auto flex w-full max-w-3xl justify-center py-16">
        <p className="text-sm text-slate-600">Loading…</p>
      </div>
    );
  }

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
      <h1 className="text-2xl font-bold">Finish setting up your Yay! Tickets account</h1>
      <p className="mt-1 text-sm text-slate-600">
        You signed in with Google. Add the same details we collect for a full registration so we can personalize your
        experience.
      </p>
      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <RegistrationOnboardingForm
          form={form}
          setForm={setForm}
          influencerProfile={influencerProfile}
          setInfluencerProfile={setInfluencerProfile}
          dealProfile={dealProfile}
          setDealProfile={setDealProfile}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          emailMode="readonly"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save and continue"}
        </button>
      </form>
      {error ? <p className="mt-3 text-sm font-medium text-rose-600">{error}</p> : null}
      <p className="mt-4 text-sm text-slate-600">
        Wrong account?{" "}
        <button
          type="button"
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="font-semibold text-brand-600 underline"
        >
          Sign out and try another
        </button>
      </p>
    </motion.div>
  );
}
