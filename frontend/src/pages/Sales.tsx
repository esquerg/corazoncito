import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { inputCls, labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type { Product, SaleSummaryRow } from "../lib/types";

type Toast = { kind: "ok" | "error"; text: string } | null;

export function Sales() {
  const { t } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<SaleSummaryRow[]>([]);
  const [totals, setTotals] = useState({ units: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [prod, today] = await Promise.all([api.listProducts(), api.salesToday()]);
      const active = prod.products.filter((p) => p.active);
      setProducts(active);
      setSummary(today.summary);
      setTotals({ units: today.totalUnits, revenue: today.totalRevenue });
      if (active.length > 0 && !productId) setProductId(String(active[0].id));
    } catch {
      setToast({ kind: "error", text: t("sales.genericError") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!productId) return;
    setSubmitting(true);
    setToast(null);
    try {
      const res = await api.createSale(Number(productId), Number(quantity), notes.trim() || null);
      let text = t("sales.soldOk", { qty: res.sale.quantity, name: res.sale.productName });
      if (res.lowStock.length > 0) {
        text += " " + t("sales.lowStockWarn", { names: res.lowStock.map((l) => l.name).join(", ") });
      }
      setToast({ kind: "ok", text });
      setQuantity("1");
      setNotes("");
      await loadAll();
    } catch (err) {
      setToast({
        kind: "error",
        text: err instanceof ApiError ? err.message : t("sales.genericError"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-terracotta-800">{t("sales.title")}</h1>
        <p className="mt-1 text-sm text-terracotta-500">{t("sales.subtitle")}</p>
      </div>

      {toast && (
        <p
          role="alert"
          className={
            "mb-4 rounded-lg px-3 py-2 text-sm " +
            (toast.kind === "ok" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")
          }
        >
          {toast.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-terracotta-100">
          <h2 className="mb-4 text-lg font-semibold text-terracotta-700">{t("sales.newSale")}</h2>
          {products.length === 0 && !loading ? (
            <p className="text-sm text-terracotta-500">{t("sales.noProducts")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="sale-product">{t("sales.product")}</label>
                <select id="sale-product" className={inputCls} value={productId} onChange={(e) => setProductId(e.target.value)} required>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.price != null ? ` — $${p.price.toFixed(2)}` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls} htmlFor="sale-qty">{t("sales.quantity")}</label>
                <input id="sale-qty" type="number" min="1" step="1" className={inputCls} value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
              </div>
              <div>
                <label className={labelCls} htmlFor="sale-notes">{t("sales.notes")}</label>
                <input id="sale-notes" className={inputCls} placeholder={t("sales.notesPlaceholder")} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <button type="submit" disabled={submitting} className="w-full rounded-lg bg-terracotta-500 px-4 py-3 text-lg font-semibold text-white hover:bg-terracotta-600 disabled:opacity-60">
                {submitting ? t("common.saving") : t("sales.register")}
              </button>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terracotta-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-terracotta-700">{t("sales.todayTitle")}</h2>
            <div className="text-sm text-terracotta-600">
              <span className="font-semibold">{totals.units}</span> {t("sales.totalUnits").toLowerCase()} ·{" "}
              <span className="font-semibold">${totals.revenue.toFixed(2)}</span>
            </div>
          </div>
          {loading ? (
            <p className="p-6 text-terracotta-500">{t("common.loading")}</p>
          ) : summary.length === 0 ? (
            <p className="p-6 text-terracotta-500">{t("sales.empty")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("sales.product")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t("sales.units")}</th>
                  <th className="px-4 py-3 text-right font-semibold">{t("sales.revenue")}</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((row) => (
                  <tr key={row.productId} className="border-b border-terracotta-50 last:border-0">
                    <td className="px-4 py-3 font-medium text-terracotta-900">{row.productName}</td>
                    <td className="px-4 py-3 text-right text-terracotta-700">{row.units}</td>
                    <td className="px-4 py-3 text-right text-terracotta-700">${Number(row.revenue).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  );
}
