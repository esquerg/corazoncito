import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";
import { ModalShell, inputCls, labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type {
  Ingredient,
  Product,
  ProductCategory,
  ProductDetail,
} from "../lib/types";

const CATEGORIES: ProductCategory[] = ["espresso", "cold", "hot", "special"];
type Toast = { kind: "ok" | "error"; text: string } | null;

function errorText(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) return err.message;
  return t("products.genericError");
}

export function Products() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isOwner = user?.role === "owner";

  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [recipeFor, setRecipeFor] = useState<Product | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { products } = await api.listProducts();
      setItems(products);
    } catch {
      setToast({ kind: "error", text: t("products.genericError") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(p: Product) {
    if (!window.confirm(t("products.deletedOk") + "?")) return;
    try {
      await api.deleteProduct(p.id);
      setToast({ kind: "ok", text: t("products.deletedOk") });
      await load();
    } catch (err) {
      setToast({ kind: "error", text: errorText(err, t) });
    }
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-terracotta-800">
            {t("products.title")}
          </h1>
          <p className="mt-1 text-sm text-terracotta-500">{t("products.subtitle")}</p>
        </div>
        {isOwner && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white hover:bg-terracotta-600"
          >
            + {t("products.newProduct")}
          </button>
        )}
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
        {loading ? (
          <p className="p-6 text-terracotta-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-terracotta-500">{t("products.empty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("products.name")}</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  {t("products.category")}
                </th>
                <th className="px-4 py-3 text-right font-semibold">{t("products.price")}</th>
                <th className="px-4 py-3 font-semibold">{t("products.status")}</th>
                <th className="px-4 py-3 text-right font-semibold">{t("products.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-terracotta-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-terracotta-900">{p.name}</td>
                  <td className="hidden px-4 py-3 text-terracotta-600 sm:table-cell">
                    {t(`productCategories.${p.category}`)}
                  </td>
                  <td className="px-4 py-3 text-right text-terracotta-700">
                    {p.price != null ? `$${p.price.toFixed(2)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "text-xs font-semibold " +
                        (p.active ? "text-green-700" : "text-terracotta-400")
                      }
                    >
                      {p.active ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => setRecipeFor(p)}
                        className="rounded-md px-2 py-1 text-terracotta-600 hover:bg-terracotta-50"
                      >
                        {t("products.recipe")}
                      </button>
                      {isOwner && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(p);
                              setFormOpen(true);
                            }}
                            className="rounded-md px-2 py-1 text-terracotta-600 hover:bg-terracotta-50"
                          >
                            {t("common.edit")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                          >
                            {t("common.delete")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <ProductFormModal
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(text) => {
            setFormOpen(false);
            setToast({ kind: "ok", text });
            void load();
          }}
        />
      )}

      {recipeFor && (
        <RecipeModal
          product={recipeFor}
          canEdit={isOwner}
          onClose={() => setRecipeFor(null)}
          onSaved={(text) => {
            setToast({ kind: "ok", text });
          }}
        />
      )}
    </Layout>
  );
}

function ProductFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Product | null;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const isEdit = editing !== null;
  const [name, setName] = useState(editing?.name ?? "");
  const [category, setCategory] = useState<ProductCategory>(editing?.category ?? "espresso");
  const [price, setPrice] = useState(editing?.price != null ? String(editing.price) : "");
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = { name, category, price: price ? Number(price) : null, active };
    try {
      if (isEdit) {
        await api.updateProduct(editing.id, payload);
        onSaved(t("products.updatedOk"));
      } else {
        await api.createProduct(payload);
        onSaved(t("products.createdOk"));
      }
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell title={isEdit ? t("products.editTitle") : t("products.createTitle")} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="p-name">{t("products.name")}</label>
          <input id="p-name" className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="p-cat">{t("products.category")}</label>
            <select id="p-cat" className={inputCls} value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{t(`productCategories.${c}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="p-price">{t("products.price")}</label>
            <input id="p-price" type="number" min="0" step="any" className={inputCls} value={price} onChange={(e) => setPrice(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-terracotta-700">
          <input type="checkbox" className="h-4 w-4 accent-terracotta-500" checked={active} onChange={(e) => setActive(e.target.checked)} />
          {t("common.active")}
        </label>
        {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 font-semibold text-terracotta-600 hover:bg-terracotta-50">{t("common.cancel")}</button>
          <button type="submit" disabled={submitting} className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white hover:bg-terracotta-600 disabled:opacity-60">{submitting ? t("common.saving") : t("common.save")}</button>
        </div>
      </form>
    </ModalShell>
  );
}

type DraftRow = { ingredientId: number; quantity: string };

function RecipeModal({
  product,
  canEdit,
  onClose,
  onSaved,
}: {
  product: Product;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const [d, ing] = await Promise.all([api.getProduct(product.id), api.listIngredients()]);
      setDetail(d.product);
      setIngredients(ing.ingredients);
      setRows(
        d.product.items.map((i) => ({ ingredientId: i.ingredientId, quantity: String(i.quantity) })),
      );
    })().catch(() => setError(t("products.genericError")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function addRow() {
    const firstId = ingredients[0]?.id;
    if (firstId) setRows((r) => [...r, { ingredientId: firstId, quantity: "" }]);
  }
  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }
  function updateRow(idx: number, patch: Partial<DraftRow>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      const payload = {
        items: rows
          .filter((r) => Number(r.quantity) > 0)
          .map((r) => ({ ingredientId: r.ingredientId, quantity: Number(r.quantity) })),
      };
      const res = await api.setRecipe(product.id, payload);
      setDetail(res.product);
      onSaved(t("products.recipeSavedOk"));
      onClose();
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  const unitFor = (id: number) => ingredients.find((i) => i.id === id)?.unit ?? "";

  return (
    <ModalShell title={t("products.recipeFor", { name: product.name })} onClose={onClose}>
      {!detail ? (
        <p className="text-terracotta-500">{t("common.loading")}</p>
      ) : (
        <div className="space-y-4">
          {rows.length === 0 && (
            <p className="rounded-lg bg-sand px-3 py-2 text-sm text-terracotta-600">
              {t("products.noRecipe")}
            </p>
          )}

          <div className="space-y-2">
            {rows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <select
                  className={inputCls + " flex-1"}
                  value={row.ingredientId}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(idx, { ingredientId: Number(e.target.value) })}
                >
                  {ingredients.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  step="any"
                  className={inputCls + " w-24"}
                  placeholder={t("products.quantity")}
                  value={row.quantity}
                  disabled={!canEdit}
                  onChange={(e) => updateRow(idx, { quantity: e.target.value })}
                />
                <span className="w-8 text-xs text-terracotta-400">{unitFor(row.ingredientId)}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                    aria-label="remove"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {canEdit && ingredients.length > 0 && (
            <button
              type="button"
              onClick={addRow}
              className="text-sm font-semibold text-terracotta-600 hover:underline"
            >
              + {t("products.addIngredient")}
            </button>
          )}

          {detail.theoreticalCost != null && (
            <p className="text-sm text-terracotta-600">
              {t("products.theoreticalCost")}:{" "}
              <span className="font-semibold">${detail.theoreticalCost.toFixed(3)}</span>
            </p>
          )}

          {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2.5 font-semibold text-terracotta-600 hover:bg-terracotta-50">
              {t("common.cancel")}
            </button>
            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white hover:bg-terracotta-600 disabled:opacity-60"
              >
                {submitting ? t("common.saving") : t("common.save")}
              </button>
            )}
          </div>
        </div>
      )}
    </ModalShell>
  );
}
