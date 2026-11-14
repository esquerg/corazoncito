import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { Role } from "../lib/types";
import { LanguageSwitcher } from "./LanguageSwitcher";

interface NavItem {
  to: string;
  key: string;
  roles: Role[];
}

// Solo rutas ya implementadas. Se irán agregando módulo por módulo.
const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", key: "dashboard", roles: ["owner", "manager", "barista"] },
  { to: "/ingredients", key: "ingredients", roles: ["owner", "manager"] },
  { to: "/suppliers", key: "suppliers", roles: ["owner", "manager"] },
  { to: "/inventory", key: "inventory", roles: ["owner", "manager"] },
  { to: "/products", key: "products", roles: ["owner", "manager"] },
  { to: "/sales", key: "sales", roles: ["owner", "manager", "barista"] },
  { to: "/reports", key: "reports", roles: ["owner", "manager"] },
  { to: "/users", key: "users", roles: ["owner"] },
];

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  const items = NAV_ITEMS.filter((item) => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-terracotta-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <span className="text-lg font-bold text-terracotta-600">
            ☕ {t("common.appName")}
          </span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-terracotta-200 px-3 py-1.5 text-sm font-semibold text-terracotta-600 hover:bg-terracotta-50"
            >
              {t("common.logout")}
            </button>
          </div>
        </div>
        <nav className="mx-auto max-w-5xl overflow-x-auto px-2">
          <ul className="flex gap-1">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    "block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors " +
                    (isActive
                      ? "border-terracotta-500 text-terracotta-700"
                      : "border-transparent text-terracotta-400 hover:text-terracotta-600")
                  }
                >
                  {t(`nav.${item.key}`)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
