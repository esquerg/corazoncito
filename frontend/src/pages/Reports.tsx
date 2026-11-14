import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { inputCls, labelCls } from "../components/ui";
import { api } from "../lib/api";
import type { VarianceRow } from "../lib/types";

export function Reports() {
  const { t } = useTranslation();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState<VarianceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(params?: { from?: string; to?: string }) {
    setLoading(true);
    setError(null);
    try {
      const res = await api.variance(params);
      setRows(res.rows);
    } catch {
      setError(t("reports.genericError"));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function apply() {
    const params: { from?: string; to?: string } = {};
    if (from) params.from = new Date(from).toISOString();
    if (to) {
      const end = new Date(to);
      end.setHours(23, 59, 59, 999);
      params.to = end.toISOString();
    }
    void load(params);
  }

  function clear() {
    setFrom("");
    setTo("");
    void load();
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-terracotta-800">{t("reports.title")}</h1>
        <p className="mt-1 text-sm text-terracotta-500">{t("reports.subtitle")}</p>
      </div>

      <div className="mb-4 rounded-2xl bg-sand p-4 text-sm text-terracotta-700">
        <p className="font-semibold">{t("reports.explainTitle")}</p>
        <p className="mt-1 text-terracotta-600">{t("reports.explain")}</p>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls} htmlFor="rep-from">{t("reports.from")}</label>
          <input id="rep-from" type="date" className={inputCls} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className={labelCls} htmlFor="rep-to">{t("reports.to")}</label>
          <input id="rep-to" type="date" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <button type="button" onClick={apply} className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white hover:bg-terracotta-600">
          {t("reports.apply")}
        </button>
        <button type="button" onClick={clear} className="rounded-lg px-4 py-2.5 font-semibold text-terracotta-600 hover:bg-terracotta-50">
          {t("reports.clear")}
        </button>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
        {loading ? (
          <p className="p-6 text-terracotta-500">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-terracotta-500">{t("reports.empty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("reports.ingredient")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("reports.purchased")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("reports.consumed")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("reports.varianceCol")}</th>
                <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
                  {t("reports.currentStock")}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.ingredientId} className="border-b border-terracotta-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-terracotta-900">{r.name}</td>
                  <td className="px-4 py-3 text-right text-terracotta-700">
                    {r.purchased} {r.unit === "unit" ? "" : r.unit}
                  </td>
                  <td className="px-4 py-3 text-right text-terracotta-700">
                    {r.consumed} {r.unit === "unit" ? "" : r.unit}
                  </td>
                  <td
                    className={
                      "px-4 py-3 text-right font-semibold " +
                      (r.variance < 0 ? "text-red-600" : "text-green-700")
                    }
                  >
                    {r.variance > 0 ? "+" : ""}{r.variance} {r.unit === "unit" ? "" : r.unit}
                  </td>
                  <td className="hidden px-4 py-3 text-right text-terracotta-500 sm:table-cell">
                    {r.currentStock} {r.unit === "unit" ? "" : r.unit}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
