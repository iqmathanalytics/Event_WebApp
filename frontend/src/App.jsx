import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import InfluencersPage from "./pages/InfluencersPage";
import DealsPage from "./pages/DealsPage";
import LoginPage from "./pages/LoginPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import RegisterPage from "./pages/RegisterPage";
import SetPasswordPage from "./pages/SetPasswordPage";
import ContactPage from "./pages/ContactPage";
import NewsletterPage from "./pages/NewsletterPage";
import NotFoundPage from "./pages/NotFoundPage";
import AdminRoute from "./components/AdminRoute";
import UserRoute from "./components/UserRoute";
import OrganizerRoute from "./components/OrganizerRoute";
import AnimatedBackground from "./components/AnimatedBackground";
import LogoutOverlay from "./components/LogoutOverlay";
import NavigationProgress from "./components/NavigationProgress";
import ScrollToTop from "./components/ScrollToTop";
import { getEventLandingConfig } from "./eventLandings/registry";

const EventDetailsPage = lazy(() => import("./pages/EventDetailsPage"));
const DealDetailsPage = lazy(() => import("./pages/DealDetailsPage"));
const InfluencerDetailsPage = lazy(() => import("./pages/InfluencerDetailsPage"));
const UserDashboardPage = lazy(() => import("./pages/UserDashboardPage"));
const UserSubmissionsPage = lazy(() => import("./pages/UserSubmissionsPage"));
const OrganizerDashboardPage = lazy(() => import("./pages/OrganizerDashboardPage"));
const AdminDashboardPage = lazy(() => import("./pages/AdminDashboardPage"));
const AdminVerifyTicketPage = lazy(() => import("./pages/AdminVerifyTicketPage"));
const EventLandingPage = lazy(() => import("./eventLandings/EventLandingPage"));

function RouteFallback({ label = "Loading…" }) {
  return <p className="py-10 text-center text-sm text-slate-500">{label}</p>;
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
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route
              path="/events/:slug"
              element={
                <Suspense fallback={<RouteFallback label="Loading event…" />}>
                  <EventDetailsPage />
                </Suspense>
              }
            />
            <Route path="/influencers" element={<InfluencersPage />} />
            <Route
              path="/influencers/:slug"
              element={
                <Suspense fallback={<RouteFallback label="Loading profile…" />}>
                  <InfluencerDetailsPage />
                </Suspense>
              }
            />
            <Route path="/deals" element={<DealsPage />} />
            <Route
              path="/deals/:slug"
              element={
                <Suspense fallback={<RouteFallback label="Loading deal…" />}>
                  <DealDetailsPage />
                </Suspense>
              }
            />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<StaffLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/set-password" element={<SetPasswordPage />} />
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
            element={
              <UserRoute>
                <DashboardLayout />
              </UserRoute>
            }
          >
            <Route
              path="/dashboard/user"
              element={
                <Suspense fallback={<RouteFallback label="Loading dashboard…" />}>
                  <UserDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/user/submissions"
              element={
                <Suspense fallback={<RouteFallback label="Loading submissions…" />}>
                  <UserSubmissionsPage />
                </Suspense>
              }
            />
          </Route>

          <Route
            path="/dashboard/organizer"
            element={
              <OrganizerRoute>
                <DashboardLayout />
              </OrganizerRoute>
            }
          >
            <Route
              index
              element={
                <Suspense fallback={<RouteFallback label="Loading organizer dashboard…" />}>
                  <OrganizerDashboardPage />
                </Suspense>
              }
            />
          </Route>

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
                <Suspense fallback={<RouteFallback label="Loading admin dashboard…" />}>
                  <AdminDashboardPage />
                </Suspense>
              }
            />
            <Route
              path="/dashboard/admin/verify-ticket"
              element={
                <Suspense fallback={<RouteFallback label="Loading ticket scanner…" />}>
                  <AdminVerifyTicketPage />
                </Suspense>
              }
            />
          </Route>

          <Route
            path="/:eventSlug"
            element={
              <Suspense fallback={<RouteFallback label="Loading event…" />}>
                <EventLandingPage />
              </Suspense>
            }
          />
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
