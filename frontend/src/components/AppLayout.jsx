import {
  ClipboardList,
  FileClock,
  FileText,
  Home,
  LogOut,
  ReceiptText,
  Settings,
  ShieldCheck,
  Users,
  WalletCards
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import NotificationBell from "./NotificationBell.jsx";

const baseNav = [
  { to: "/", labelKey: "dashboard", icon: Home },
  { to: "/customers", labelKey: "customers", icon: Users },
  { to: "/reports", labelKey: "reports", icon: FileText },
  { to: "/bills/new", labelKey: "bill_entry", icon: ReceiptText },
  { to: "/payments/new", labelKey: "payments", icon: WalletCards },
  { to: "/settings", labelKey: "settings", icon: Settings }
];

const ownerNav = [
  { to: "/users", labelKey: "staff", icon: ShieldCheck },
  { to: "/audit-logs", labelKey: "audit", icon: FileClock }
];

const AppLayout = () => {
  const { user, logout, isOwner } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const navItems = isOwner ? [...baseNav, ...ownerNav] : baseNav;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-white/70 bg-white/95 shadow-card backdrop-blur lg:block">
        <div className="flex h-full flex-col">
          <div className="brand-gradient px-5 py-6 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-white shadow-sm">
                <ClipboardList size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold">{t("app_name")}</p>
                <p className="text-xs font-bold uppercase tracking-normal text-white/75">
                  {t(`roles.${user?.role}`, { defaultValue: user?.role })}
                </p>
              </div>
              <NotificationBell />
            </div>
          </div>

          <nav className="flex-1 space-y-2 px-4 py-6">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition duration-200 ${
                      isActive
                        ? "bg-crop-light text-crop-dark shadow-sm"
                        : "text-gray-600 hover:bg-gray-50 hover:text-crop-dark"
                    }`
                  }
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-crop-dark shadow-sm transition group-hover:bg-crop-light">
                    <Icon size={18} />
                  </span>
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>

          <div className="m-4 space-y-3 rounded-3xl border border-line bg-field p-4">
            <LanguageSwitcher className="w-full justify-center" />
            <p className="truncate text-sm font-bold">{user?.name}</p>
            <p className="truncate text-xs font-medium text-gray-500">{user?.email}</p>
            <button type="button" onClick={handleLogout} className="btn-secondary mt-3 w-full">
              <LogOut size={16} />
              {t("logout")}
            </button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-white/80 bg-white/95 shadow-sm backdrop-blur lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3 font-bold">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl brand-gradient text-white">
                <ClipboardList size={18} />
              </div>
              <div>
                <p>{t("app_name")}</p>
                <p className="text-xs font-medium text-gray-500">
                  {t(`roles.${user?.role}`, { defaultValue: user?.role })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <LanguageSwitcher className="hidden sm:inline-flex" showIcon={false} />
              <button type="button" onClick={handleLogout} className="btn-secondary px-3" aria-label={t("logout")}>
                <LogOut size={16} />
              </button>
            </div>
          </div>
          <div className="px-4 pb-3 sm:hidden">
            <LanguageSwitcher className="w-full justify-center" showIcon={false} />
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition ${
                      isActive ? "bg-crop-light text-crop-dark" : "bg-gray-50 text-gray-700"
                    }`
                  }
                >
                  <Icon size={16} />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
