import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { inputCls, labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type { Ingredient, InventoryEntry, Supplier } from "../lib/types";

type Toast = { kind: "ok" | "error"; text: string } | null;

export function Inventory() {
  const { t, i18n } = useTranslation();

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [entries, setEntries] = useState<InventoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  // Campos del formulario
  const [ingredientId, setIngredientId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const [ing, sup, inv] = await Promise.all([
        api.listIngredients(),
        api.listSuppliers(),
        api.listInventory(),
      ]);
      setIngredients(ing.ingredients);
      setSuppliers(sup.suppliers);
      setEntries(inv.entries);
      if (ing.ingredients.length > 0 && !ingredientId) {
        setIngredientId(String(ing.ingredients[0].id));
      }
    } catch {
      setToast({ kind: "error", text: t("inventory.genericError") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedIngredient = ingredients.find((i) => String(i.id) === ingredientId);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!ingredientId) return;
    setSubmitting(true);
    setToast(null);
    try {
      const res = await api.createInventoryEntry({
        ingredientId: Number(ingredientId),
        supplierId: supplierId ? Number(supplierId) : null,
        quantity: Number(quantity),
        unitCost: unitCost ? Number(unitCost) : null,
        reference: reference.trim() || null,
      });
      setToast({
        kind: "ok",
        text: t("inventory.stockAfter", {
          name: res.entry.ingredientName,
          stock: res.newStock,
        }),
      });
      setQuantity("");
      setUnitCost("");
      setReference("");
      await loadAll();
    } catch (err) {
      setToast({
        kind: "error",
        text: err instanceof ApiError ? err.message : t("inventory.genericError"),
      });
    } finally {
      setSubmitting(false);
    }
  }

  function fmtDate(iso: string) {
    return new Date(iso).toLocaleString(i18n.resolvedLanguage, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-terracotta-800">
          {t("inventory.title")}
        </h1>
        <p className="mt-1 text-sm text-terracotta-500">{t("inventory.subtitle")}</p>
      </div>

      {toast && (
        <p
          role="alert"
          className={
            "mb-4 rounded-lg px-3 py-2 text-sm " +
            (toast.kind === "ok"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700")
          }
        >
          {toast.text}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        {/* Formulario de nueva entrada */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-terracotta-100">
          <h2 className="mb-4 text-lg font-semibold text-terracotta-700">
            {t("inventory.newEntry")}
          </h2>

          {ingredients.length === 0 && !loading ? (
            <p className="text-sm text-terracotta-500">
              {t("inventory.noIngredients")}
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="inv-ingredient">
                  {t("inventory.ingredient")}
                </label>
                <select
                  id="inv-ingredient"
                  className={inputCls}
                  value={ingredientId}
                  onChange={(e) => setIngredientId(e.target.value)}
                  required
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls} htmlFor="inv-supplier">
                  {t("inventory.supplier")}
                </label>
                <select
                  id="inv-supplier"
                  className={inputCls}
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                >
                  <option value="">{t("inventory.noSupplier")}</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="inv-qty">
                    {t("inventory.quantity")}
                    {selectedIngredient ? ` (${selectedIngredient.unit})` : ""}
                  </label>
                  <input
                    id="inv-qty"
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="inv-cost">
                    {t("inventory.unitCost")}
                  </label>
                  <input
                    id="inv-cost"
                    type="number"
                    min="0"
                    step="any"
                    className={inputCls}
                    value={unitCost}
                    onChange={(e) => setUnitCost(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor="inv-ref">
                  {t("inventory.reference")}
                </label>
                <input
                  id="inv-ref"
                  className={inputCls}
                  placeholder={t("inventory.referencePlaceholder")}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white hover:bg-terracotta-600 disabled:opacity-60"
              >
                {submitting ? t("common.saving") : t("inventory.newEntry")}
              </button>
            </form>
          )}
        </section>

        {/* Libro de movimientos */}
        <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
          <h2 className="border-b border-terracotta-100 px-4 py-3 text-lg font-semibold text-terracotta-700">
            {t("inventory.log")}
          </h2>
          {loading ? (
            <p className="p-6 text-terracotta-500">{t("common.loading")}</p>
          ) : entries.length === 0 ? (
            <p className="p-6 text-terracotta-500">{t("inventory.empty")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
                <tr>
                  <th className="px-4 py-3 font-semibold">{t("inventory.date")}</th>
                  <th className="px-4 py-3 font-semibold">
                    {t("inventory.ingredient")}
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    {t("inventory.quantity")}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                    {t("inventory.supplier")}
                  </th>
                  <th className="hidden px-4 py-3 font-semibold md:table-cell">
                    {t("inventory.reference")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-terracotta-50 last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-terracotta-500">
                      {fmtDate(e.receivedAt)}
                    </td>
                    <td className="px-4 py-3 font-medium text-terracotta-900">
                      {e.ingredientName}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-green-700">
                      +{e.quantity} {e.ingredientUnit === "unit" ? "" : e.ingredientUnit}
                    </td>
                    <td className="hidden px-4 py-3 text-terracotta-600 sm:table-cell">
                      {e.supplierName || "—"}
                    </td>
                    <td className="hidden px-4 py-3 text-terracotta-500 md:table-cell">
                      {e.reference || "—"}
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
