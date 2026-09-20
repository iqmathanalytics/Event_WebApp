import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useSearchParams } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import AdminRoute from "./components/AdminRoute";
import UserRoute from "./components/UserRoute";
import AnimatedBackground from "./components/AnimatedBackground";
import LogoutOverlay from "./components/LogoutOverlay";
import NavigationProgress from "./components/NavigationProgress";
import ScrollToTop from "./components/ScrollToTop";
import { getEventLandingConfig } from "./eventLandings/registry";
import HomeRoute from "./pages/HomeRoute";

const EventsPage = lazy(() => import("./pages/EventsPage"));
const EventDetailsPage = lazy(() => import("./pages/EventDetailsPage"));
const InfluencersPage = lazy(() => import("./pages/InfluencersPage"));
const InfluencerDetailsPage = lazy(() => import("./pages/InfluencerDetailsPage"));
const DealsPage = lazy(() => import("./pages/DealsPage"));
const DealDetailsPage = lazy(() => import("./pages/DealDetailsPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const StaffLoginPage = lazy(() => import("./pages/StaffLoginPage"));
const RegisterPage = lazy(() => import("./pages/RegisterPage"));
const SetPasswordPage = lazy(() => import("./pages/SetPasswordPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const NewsletterPage = lazy(() => import("./pages/NewsletterPage"));
const LegalDocumentPage = lazy(() => import("./pages/LegalDocumentPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const UserDashboardPage = lazy(() => import("./pages/UserDashboardPage"));
const UserSubmissionsPage = lazy(() => import("./pages/UserSubmissionsPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const CheckInPage = lazy(() => import("./pages/CheckInPage"));
const BookingConfirmedPage = lazy(() => import("./pages/BookingConfirmedPage"));
const EventLandingPage = lazy(() => import("./eventLandings/EventLandingPage"));
const SeatingDesignerPage = lazy(() => import("./pages/SeatingDesignerPage"));

function RouteFallback({ label = "Loading..." }) {
  return <p className="py-10 text-center text-sm text-slate-500">{label}</p>;
}

function SuspendedPage({ children, label = "Loading..." }) {
  return <Suspense fallback={<RouteFallback label={label} />}>{children}</Suspense>;
}

function RedirectOrganizerDashboardToUser() {
  const [params] = useSearchParams();
  const next = new URLSearchParams(params);
  if (next.get("invite")) {
    next.set("host", "shared");
  } else if (!next.get("host")) {
    const section = String(next.get("section") || "").toLowerCase();
    if (section === "my-events") {
      next.set("host", "events");
    } else if (section) {
      next.set("host", section);
    } else {
      next.set("host", "overview");
    }
  }
  const qs = next.toString();
  return <Navigate to={`/dashboard/user${qs ? `?${qs}` : ""}`} replace />;
}

function RedirectLegacyVerifyTicket() {
  const [params] = useSearchParams();
  const code = params.get("code");
  const to = code ? `/check-in?code=${encodeURIComponent(code)}` : "/check-in";
  return <Navigate to={to} replace />;
}

function App() {
  const location = useLocation();
  const rootSlug = location.pathname.split("/").filter(Boolean)[0];
  const isEventLanding = Boolean(rootSlug && getEventLandingConfig(rootSlug));

  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      {!isEventLanding ? <AnimatedBackground /> : null}
      <LogoutOverlay />
      <NavigationProgress />
      <ScrollToTop />
      <div className="relative z-[2]">
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomeRoute />} />
            <Route
              path="/events"
              element={
                <SuspendedPage label="Loading events...">
                  <EventsPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/events/:slug"
              element={
                <SuspendedPage label="Loading event...">
                  <EventDetailsPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/influencers"
              element={
                <SuspendedPage label="Loading influencers...">
                  <InfluencersPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/influencers/:slug"
              element={
                <SuspendedPage label="Loading profile...">
                  <InfluencerDetailsPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/deals"
              element={
                <SuspendedPage label="Loading deals...">
                  <DealsPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/deals/:slug"
              element={
                <SuspendedPage label="Loading deal...">
                  <DealDetailsPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/contact"
              element={
                <SuspendedPage>
                  <ContactPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/newsletter"
              element={
                <SuspendedPage>
                  <NewsletterPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/privacy"
              element={
                <SuspendedPage>
                  <LegalDocumentPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/terms"
              element={
                <SuspendedPage>
                  <LegalDocumentPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/login"
              element={
                <SuspendedPage>
                  <LoginPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/admin"
              element={
                <SuspendedPage>
                  <StaffLoginPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/register"
              element={
                <SuspendedPage>
                  <RegisterPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/set-password"
              element={
                <SuspendedPage>
                  <SetPasswordPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/reset-password"
              element={
                <SuspendedPage>
                  <SetPasswordPage mode="reset" />
                </SuspendedPage>
              }
            />
            <Route
              path="/booking/confirmed"
              element={
                <SuspendedPage label="Loading confirmation...">
                  <BookingConfirmedPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/complete-signup"
              element={
                <UserRoute>
                  <Navigate to="/dashboard/user" replace />
                </UserRoute>
              }
            />
          </Route>

          <Route
            path="/check-in"
            element={
              <SuspendedPage label="Loading check-in...">
                <CheckInPage />
              </SuspendedPage>
            }
          />
          <Route path="/dashboard/admin/verify-ticket" element={<RedirectLegacyVerifyTicket />} />

          <Route
            element={
              <UserRoute>
                <DashboardLayout />
              </UserRoute>
            }
          >
            <Route
              path="/dashboard/user"
              element={
                <SuspendedPage label="Loading dashboard...">
                  <UserDashboardPage />
                </SuspendedPage>
              }
            />
            <Route
              path="/dashboard/user/submissions"
              element={
                <SuspendedPage label="Loading submissions...">
                  <UserSubmissionsPage />
                </SuspendedPage>
              }
            />
          </Route>

          <Route path="/dashboard/organizer" element={<RedirectOrganizerDashboardToUser />} />

          <Route
            path="/seating-designer/:eventId"
            element={
              <UserRoute>
                <SuspendedPage label="Loading seating designer...">
                  <SeatingDesignerPage />
                </SuspendedPage>
              </UserRoute>
            }
          />

          <Route
            element={
              <AdminRoute>
                <DashboardLayout />
              </AdminRoute>
            }
          >
            <Route
              path="/dashboard/admin"
              element={
                <SuspendedPage label="Loading admin dashboard...">
                  <AdminDashboardPage />
                </SuspendedPage>
              }
            />
          </Route>

          <Route
            path="/:eventSlug"
            element={
              <SuspendedPage label="Loading event...">
                <EventLandingPage />
              </SuspendedPage>
            }
          />
          <Route
            path="/404"
            element={
              <SuspendedPage>
                <NotFoundPage />
              </SuspendedPage>
            }
          />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
