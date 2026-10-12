import { NavLink } from "react-router-dom";
import { FiCalendar, FiHome, FiTag, FiUser, FiUsers } from "react-icons/fi";
import useAuth from "../hooks/useAuth";

const baseItems = [
  { to: "/", label: "Home", icon: FiHome },
  { to: "/events", label: "Events", icon: FiCalendar },
  { to: "/influencers", label: "Influencers", icon: FiUsers },
  { to: "/deals", label: "Deals", icon: FiTag }
];

function MobileBottomNav() {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const profileTarget = isAdmin ? "/dashboard/admin" : "/dashboard/user";
  const profileName = String(user?.name || "").trim();

  const items = [
    ...baseItems,
    { to: isAuthenticated ? profileTarget : "/login", label: "Profile", icon: FiUser }
  ];

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Bottom navigation">
      {items.map((item) => {
        const Icon = item.icon;
        const isProfile = item.icon === FiUser;
        return (
          <NavLink
            key={`${item.to}-${item.label}`}
            to={item.to}
            title={isProfile && isAuthenticated && profileName ? `Book My Tickets – ${profileName}` : undefined}
            className={({ isActive }) =>
              `inline-flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1 text-xs font-semibold transition duration-150 ${
                isActive ? "bg-rose-50 text-brand-600" : "text-slate-500 active:scale-[0.98]"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon className="h-5 w-5" aria-hidden="true" />
                <span className="max-w-full truncate text-center leading-none">{item.label}</span>
                <span
                  className={`h-1 w-4 rounded-full ${isActive ? "bg-brand-600" : "bg-transparent"}`}
                  aria-hidden="true"
                />
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
