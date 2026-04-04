import { Navigate, Route, Routes } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/HomePage";
import EventsPage from "./pages/EventsPage";
import EventDetailsPage from "./pages/EventDetailsPage";
import DealDetailsPage from "./pages/DealDetailsPage";
import InfluencersPage from "./pages/InfluencersPage";
import InfluencerDetailsPage from "./pages/InfluencerDetailsPage";
import DealsPage from "./pages/DealsPage";
import LoginPage from "./pages/LoginPage";
import StaffLoginPage from "./pages/StaffLoginPage";
import RegisterPage from "./pages/RegisterPage";
import UserDashboardPage from "./pages/UserDashboardPage";
import UserSubmissionsPage from "./pages/UserSubmissionsPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
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

function App() {
  return (
    <div className="relative isolate min-h-screen overflow-x-hidden">
      <AnimatedBackground />
      <LogoutOverlay />
      <NavigationProgress />
      <ScrollToTop />
      <div className="relative z-[2]">
        <Routes>
          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/events" element={<EventsPage />} />
            <Route path="/events/:id" element={<EventDetailsPage />} />
            <Route path="/influencers" element={<InfluencersPage />} />
            <Route path="/influencers/:id" element={<InfluencerDetailsPage />} />
            <Route path="/deals" element={<DealsPage />} />
            <Route path="/deals/:id" element={<DealDetailsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/newsletter" element={<NewsletterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<StaffLoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
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
            <Route path="/dashboard/user" element={<UserDashboardPage />} />
            <Route path="/dashboard/user/submissions" element={<UserSubmissionsPage />} />
          </Route>

          <Route
            path="/dashboard/organizer"
            element={
              <OrganizerRoute>
                <Navigate to={{ pathname: "/dashboard/user", hash: "host-events" }} replace />
              </OrganizerRoute>
            }
          />

          <Route
            element={
              <AdminRoute>
                <DashboardLayout />
              </AdminRoute>
            }
          >
            <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
          </Route>

          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
