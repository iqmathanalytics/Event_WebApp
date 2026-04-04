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
            title={isProfile && isAuthenticated && profileName ? `Yay! – ${profileName}` : undefined}
            className={({ isActive }) =>
              `inline-flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition ${
                isActive ? "text-brand-600" : "text-slate-500"
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span className="max-w-[4.5rem] truncate text-center">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
