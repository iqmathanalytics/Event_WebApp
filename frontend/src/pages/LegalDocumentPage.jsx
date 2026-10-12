import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BRAND_NAME, BRAND_SUPPORT_EMAIL } from "../constants/brand";
import { useRouteContentReady } from "../context/RouteContentReadyContext";

const sectionClass = "space-y-2 text-sm leading-relaxed text-slate-600";
const headingClass = "text-base font-bold text-slate-900";

function PrivacyBody() {
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-600">
        This Privacy Policy explains how {BRAND_NAME} collects, uses, and shares personal information when you use our
        website and related services. By creating an account or using the platform, you agree to this policy.
      </p>
      <section className={sectionClass}>
        <h2 className={headingClass}>Information we collect</h2>
        <p>
          We collect account details you provide (such as name, email, and optional phone number), listing and booking
          information, messages you send through contact or support forms, and technical data such as device, browser,
          and approximate location used to show city listings.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>How we use information</h2>
        <p>
          We use this information to operate the marketplace, process ticket bookings, communicate about your account
          and orders, moderate listings, improve the site, and meet legal obligations. Payment details are handled by
          our payment processor; we do not store full card numbers on our servers.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Sharing</h2>
        <p>
          We share information with organizers for events you book, with service providers who help us host, email, and
          process payments, and when required by law. We do not sell your personal information.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Your choices</h2>
        <p>
          You can update profile details from your dashboard, unsubscribe from marketing emails, and contact us to ask
          about access or deletion of your account data, subject to records we must keep for bookings and compliance.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Contact</h2>
        <p>
          Questions about privacy:{" "}
          <a className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline lg:min-h-0" href={`mailto:${BRAND_SUPPORT_EMAIL}`}>
            {BRAND_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </>
  );
}

function TermsBody() {
  return (
    <>
      <p className="text-sm leading-relaxed text-slate-600">
        These Terms of Service govern your use of {BRAND_NAME}. If you do not agree, please do not create an account or
        use the platform.
      </p>
      <section className={sectionClass}>
        <h2 className={headingClass}>Accounts</h2>
        <p>
          You are responsible for the accuracy of your registration details and for keeping your password confidential.
          Notify us promptly if you suspect unauthorized access.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Listings and tickets</h2>
        <p>
          Organizers are responsible for the accuracy of their events, pricing, and venue details. Ticket availability
          and refunds follow the organizer’s policy and any applicable payment-processor rules. Platform checkout is
          provided as a convenience; some events sell tickets on an external site.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Acceptable use</h2>
        <p>
          You agree not to misuse the service, post unlawful or misleading content, interfere with other users, or
          attempt to access accounts or data that are not yours.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Limitation of liability</h2>
        <p>
          {BRAND_NAME} provides the platform as-is. To the fullest extent permitted by law, we are not liable for
          organizer cancellations, venue issues, or third-party ticket pages. Our total liability for claims relating
          to the service is limited to the fees you paid us for the transaction giving rise to the claim, if any.
        </p>
      </section>
      <section className={sectionClass}>
        <h2 className={headingClass}>Contact</h2>
        <p>
          Questions about these terms:{" "}
          <a className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline lg:min-h-0" href={`mailto:${BRAND_SUPPORT_EMAIL}`}>
            {BRAND_SUPPORT_EMAIL}
          </a>
          .
        </p>
      </section>
    </>
  );
}

function LegalDocumentPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname.startsWith("/privacy");
  const title = isPrivacy ? "Privacy Policy" : "Terms of Service";
  useRouteContentReady(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = `${title} | ${BRAND_NAME}`;
    return () => {
      document.title = previousTitle;
    };
  }, [title]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto max-w-3xl px-1 py-8 sm:px-4 sm:py-14 lg:px-4"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 lg:text-[11px]">{BRAND_NAME}</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">Last updated September 16, 2026</p>
      <div className="mt-6 space-y-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:mt-8 sm:p-8">
        {isPrivacy ? <PrivacyBody /> : <TermsBody />}
      </div>
      <p className="mt-6 text-sm text-slate-500">
        Also see our{" "}
        {isPrivacy ? (
          <Link className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline lg:min-h-0" to="/terms">
            Terms of Service
          </Link>
        ) : (
          <Link className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline lg:min-h-0" to="/privacy">
            Privacy Policy
          </Link>
        )}{" "}
        and{" "}
        <Link className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline lg:min-h-0" to="/contact">
          contact support
        </Link>
        .
      </p>
    </motion.article>
  );
}

export default LegalDocumentPage;
