import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";
import { api } from "../lib/api";
import type { Ingredient, StockStatus } from "../lib/types";

const STATUS_STYLES: Record<StockStatus, { dot: string; text: string }> = {
  ok: { dot: "bg-green-500", text: "text-green-700" },
  low: { dot: "bg-amber-500", text: "text-amber-700" },
  critical: { dot: "bg-red-500", text: "text-red-700" },
};

export function Dashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const canSeeStock = user?.role === "owner" || user?.role === "manager";

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(canSeeStock);

  useEffect(() => {
    if (!canSeeStock) return;
    (async () => {
      try {
        const { ingredients } = await api.listIngredients();
        setItems(ingredients);
      } finally {
        setLoading(false);
      }
    })();
  }, [canSeeStock]);

  const attention = items.filter((i) => i.status !== "ok");

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-terracotta-800">
          {t("dashboard.welcome", { name: user?.name })}
        </h1>
        <p className="mt-1 text-terracotta-500">
          {t("dashboard.yourRole")}:{" "}
          <span className="font-semibold text-terracotta-700">
            {user ? t(`roles.${user.role}`) : ""}
          </span>
        </p>
      </div>

      {!canSeeStock ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-terracotta-100">
          <p className="text-terracotta-600">{t("dashboard.baristaHint")}</p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terracotta-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-terracotta-700">
              {t("dashboard.stockOverview")}
            </h2>
            <span
              className={
                "text-sm font-semibold " +
                (attention.length === 0 ? "text-green-700" : "text-amber-700")
              }
            >
              {attention.length === 0
                ? t("dashboard.allGood")
                : t("dashboard.needAttention", { count: attention.length })}
            </span>
          </div>

          {loading ? (
            <p className="p-6 text-terracotta-500">{t("common.loading")}</p>
          ) : items.length === 0 ? (
            <p className="p-6 text-terracotta-500">{t("dashboard.noIngredients")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("dashboard.ingredient")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t("dashboard.stock")}</th>
                  <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
                    {t("dashboard.min")}
                  </th>
                  <th className="px-4 py-3 font-semibold">{t("ingredients.status")}</th>
                </tr>
              </thead>
              <tbody>
                {[...items]
                  .sort((a, b) => {
                    const order = { critical: 0, low: 1, ok: 2 };
                    return order[a.status] - order[b.status];
                  })
                  .map((i) => {
                    const s = STATUS_STYLES[i.status];
                    return (
                      <tr key={i.id} className="border-b border-terracotta-50 last:border-0">
                        <td className="px-4 py-3 font-medium text-terracotta-900">{i.name}</td>
                        <td className="px-4 py-3 text-right text-terracotta-800">
                          {i.currentStock} {i.unit === "unit" ? "" : i.unit}
                        </td>
                        <td className="hidden px-4 py-3 text-right text-terracotta-500 sm:table-cell">
                          {i.minStock} {i.unit === "unit" ? "" : i.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span className={"inline-flex items-center gap-1.5 text-xs font-semibold " + s.text}>
                            <span className={"h-2 w-2 rounded-full " + s.dot} />
                            {t(`stockStatus.${i.status}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )}
        </section>
      )}
    </Layout>
  );
}
