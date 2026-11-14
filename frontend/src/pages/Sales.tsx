import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type { Product, ProductCategory, SaleSummaryRow } from "../lib/types";

type Toast = { kind: "ok" | "error"; text: string } | null;

const CATEGORY_ICONS: Record<ProductCategory, string> = {
  espresso: "☕",
  cold: "🧊",
  hot: "🍵",
  special: "✨",
};

function ProductCard({
  product,
  selected,
  onSelect,
}: {
  product: Product;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-center transition-colors " +
        (selected
          ? "border-terracotta-500 bg-terracotta-50 shadow-sm"
          : "border-terracotta-100 bg-white hover:border-terracotta-300 hover:bg-terracotta-50")
      }
    >
      {product.imageUrl ? (
        <img
          src={product.imageUrl}
          alt={product.name}
          className="h-12 w-12 rounded-lg object-cover"
        />
      ) : (
        <span className="text-4xl leading-none">{CATEGORY_ICONS[product.category]}</span>
      )}
      <span className="mt-1 text-sm font-semibold leading-tight text-terracotta-900">
        {product.name}
      </span>
      {product.price != null && (
        <span className="text-xs text-terracotta-500">${product.price.toFixed(2)}</span>
      )}
    </button>
  );
}

export function Sales() {
  const { t } = useTranslation();

  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<SaleSummaryRow[]>([]);
  const [totals, setTotals] = useState({ units: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
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
      const res = await api.createSale(Number(productId), quantity, notes.trim() || null);
      let text = t("sales.soldOk", { qty: res.sale.quantity, name: res.sale.productName });
      if (res.lowStock.length > 0) {
        text += " " + t("sales.lowStockWarn", { names: res.lowStock.map((l) => l.name).join(", ") });
      }
      setToast({ kind: "ok", text });
      setQuantity(1);
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

  const stepperBtn =
    "flex h-10 w-10 items-center justify-center rounded-full border-2 border-terracotta-200 text-xl font-bold text-terracotta-700 hover:border-terracotta-400 hover:bg-terracotta-50 disabled:opacity-40";

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

      <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-terracotta-100">
          <h2 className="mb-4 text-lg font-semibold text-terracotta-700">{t("sales.newSale")}</h2>

          {loading ? (
            <p className="text-sm text-terracotta-500">{t("common.loading")}</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-terracotta-500">{t("sales.noProducts")}</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <p className={labelCls}>{t("sales.product")}</p>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {products.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      selected={productId === String(p.id)}
                      onSelect={() => setProductId(String(p.id))}
                    />
                  ))}
                </div>
              </div>

              <div>
                <p className={labelCls}>{t("sales.quantity")}</p>
                <div className="mt-1 flex items-center gap-4">
                  <button
                    type="button"
                    className={stepperBtn}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-2xl font-bold text-terracotta-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    className={stepperBtn}
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor="sale-notes">
                  {t("sales.notes")}
                </label>
                <input
                  id="sale-notes"
                  className="w-full rounded-lg border border-terracotta-200 bg-cream px-3 py-2.5 text-terracotta-900 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
                  placeholder={t("sales.notesPlaceholder")}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting || !productId}
                className="w-full rounded-xl bg-terracotta-500 px-4 py-3.5 text-lg font-semibold text-white hover:bg-terracotta-600 disabled:opacity-60"
              >
                {submitting ? t("common.saving") : t("sales.register")}
              </button>
            </form>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-terracotta-100 px-4 py-3">
            <h2 className="text-lg font-semibold text-terracotta-700">{t("sales.todayTitle")}</h2>
            <div className="text-sm text-terracotta-600">
              <span className="font-semibold">{totals.units}</span>{" "}
              {t("sales.totalUnits").toLowerCase()} ·{" "}
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
                    <td className="px-4 py-3 text-right text-terracotta-700">
                      ${Number(row.revenue).toFixed(2)}
                    </td>
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
