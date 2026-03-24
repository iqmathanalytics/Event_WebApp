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
  const { isAuthenticated, isAdmin, isOrganizer } = useAuth();
  const profileTarget = isAdmin
    ? "/dashboard/admin"
    : isOrganizer
      ? "/dashboard/organizer"
      : "/dashboard/user";

  const items = [
    ...baseItems,
    { to: isAuthenticated ? profileTarget : "/login", label: isAuthenticated ? "Dashboard" : "Profile", icon: FiUser }
  ];

  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Bottom navigation">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `inline-flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition ${
                isActive ? "text-brand-600" : "text-slate-500"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
