import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { register as registerRequest, registerWithGoogle } from "../services/authService";
import useAuth from "../hooks/useAuth";
import AuthBrandLogo from "../components/AuthBrandLogo";
import GoogleContinueButton, { AuthDividerOr, isGoogleAuthConfigured } from "../components/GoogleContinueButton";
import RegistrationOnboardingForm from "../components/RegistrationOnboardingForm";
import { safeReturnPath } from "../utils/postGoogleSignIn";

function RegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [activeModal, setActiveModal] = useState(null);

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

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.interests.length < 1) {
      setError("Select at least one interest.");
      return;
    }
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
      const next = safeReturnPath(searchParams.get("next"));
      navigate(next || "/dashboard/user");
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
        <RegistrationOnboardingForm
          form={form}
          setForm={setForm}
          influencerProfile={influencerProfile}
          setInfluencerProfile={setInfluencerProfile}
          dealProfile={dealProfile}
          setDealProfile={setDealProfile}
          activeModal={activeModal}
          setActiveModal={setActiveModal}
          emailMode="editable"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={form.password}
          onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
          className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm transition focus:border-brand-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || googleLoading}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creating account..." : "Register"}
        </button>
      </form>
      {isGoogleAuthConfigured() ? (
        <>
          <AuthDividerOr />
          <GoogleContinueButton
            disabled={loading || googleLoading}
            onCredential={async (credential) => {
              if (credential == null) {
                setError("Google sign-in was cancelled or could not complete.");
                return;
              }
              setError("");
              setGoogleLoading(true);
              try {
                const response = await registerWithGoogle(credential);
                const payload = response?.data;
                if (!payload?.accessToken || !payload?.refreshToken || !payload?.user) {
                  throw new Error("Invalid Google sign-in response");
                }
                login(payload);
                const next = safeReturnPath(searchParams.get("next"));
                navigate("/complete-signup", {
                  replace: true,
                  state: { next: next || "/dashboard/user" }
                });
              } catch (err) {
                setError(err?.response?.data?.message || err?.message || "Google sign-in failed. Try again.");
              } finally {
                setGoogleLoading(false);
              }
            }}
          />
          {googleLoading ? (
            <p className="mt-2 text-center text-sm text-slate-500">Continuing with Google…</p>
          ) : null}
        </>
      ) : null}
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
    </motion.div>
  );
}

export default RegisterPage;
