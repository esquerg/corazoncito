import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { ModalShell, inputCls, labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type {
  Ingredient,
  IngredientCategory,
  IngredientUnit,
  StockStatus,
} from "../lib/types";

const UNITS: IngredientUnit[] = ["g", "ml", "unit"];
const CATEGORIES: IngredientCategory[] = ["coffee", "dairy", "syrup", "other"];

type Toast = { kind: "ok" | "error"; text: string } | null;

const STATUS_STYLES: Record<StockStatus, { dot: string; text: string }> = {
  ok: { dot: "bg-green-500", text: "text-green-700" },
  low: { dot: "bg-amber-500", text: "text-amber-700" },
  critical: { dot: "bg-red-500", text: "text-red-700" },
};

function errorText(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) return err.message;
  return t("ingredients.genericError");
}

export function Ingredients() {
  const { t } = useTranslation();

  const [items, setItems] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Ingredient | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { ingredients } = await api.listIngredients();
      setItems(ingredients);
    } catch {
      setToast({ kind: "error", text: t("ingredients.genericError") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(item: Ingredient) {
    if (!window.confirm(t("ingredients.confirmDelete", { name: item.name }))) return;
    try {
      await api.deleteIngredient(item.id);
      setToast({ kind: "ok", text: t("ingredients.deletedOk") });
      await load();
    } catch (err) {
      setToast({ kind: "error", text: errorText(err, t) });
    }
  }

  function fmt(n: number, unit: IngredientUnit) {
    const u = unit === "unit" ? "" : ` ${unit}`;
    return `${Number.isInteger(n) ? n : n.toFixed(1)}${u}`;
  }

  return (
    <Layout>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-terracotta-800">
            {t("ingredients.title")}
          </h1>
          <p className="mt-1 text-sm text-terracotta-500">
            {t("ingredients.subtitle")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-terracotta-600"
        >
          + {t("ingredients.newIngredient")}
        </button>
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

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-terracotta-100">
        {loading ? (
          <p className="p-6 text-terracotta-500">{t("common.loading")}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-terracotta-500">{t("ingredients.empty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("ingredients.name")}</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  {t("ingredients.category")}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("ingredients.currentStock")}
                </th>
                <th className="hidden px-4 py-3 text-right font-semibold sm:table-cell">
                  {t("ingredients.minStock")}
                </th>
                <th className="px-4 py-3 font-semibold">{t("ingredients.status")}</th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("ingredients.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const s = STATUS_STYLES[item.status];
                return (
                  <tr
                    key={item.id}
                    className="border-b border-terracotta-50 last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-terracotta-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-terracotta-400 sm:hidden">
                        {t(`categories.${item.category}`)}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-terracotta-600 sm:table-cell">
                      {t(`categories.${item.category}`)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-terracotta-800">
                      {fmt(item.currentStock, item.unit)}
                    </td>
                    <td className="hidden px-4 py-3 text-right text-terracotta-500 sm:table-cell">
                      {fmt(item.minStock, item.unit)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={"inline-flex items-center gap-1.5 text-xs font-semibold " + s.text}
                      >
                        <span className={"h-2 w-2 rounded-full " + s.dot} />
                        {t(`stockStatus.${item.status}`)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(item);
                            setFormOpen(true);
                          }}
                          className="rounded-md px-2 py-1 text-terracotta-600 hover:bg-terracotta-50"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="rounded-md px-2 py-1 text-red-600 hover:bg-red-50"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <IngredientFormModal
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(text) => {
            setFormOpen(false);
            setToast({ kind: "ok", text });
            void load();
          }}
        />
      )}
    </Layout>
  );
}

function IngredientFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Ingredient | null;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const isEdit = editing !== null;

  const [name, setName] = useState(editing?.name ?? "");
  const [unit, setUnit] = useState<IngredientUnit>(editing?.unit ?? "g");
  const [category, setCategory] = useState<IngredientCategory>(
    editing?.category ?? "coffee",
  );
  const [minStock, setMinStock] = useState(String(editing?.minStock ?? 0));
  const [currentStock, setCurrentStock] = useState("0");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateIngredient(editing.id, {
          name,
          unit,
          category,
          minStock: Number(minStock),
        });
        onSaved(t("ingredients.updatedOk"));
      } else {
        await api.createIngredient({
          name,
          unit,
          category,
          minStock: Number(minStock),
          currentStock: Number(currentStock),
        });
        onSaved(t("ingredients.createdOk"));
      }
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={isEdit ? t("ingredients.editTitle") : t("ingredients.createTitle")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="i-name">
            {t("ingredients.name")}
          </label>
          <input
            id="i-name"
            className={inputCls}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="i-category">
              {t("ingredients.category")}
            </label>
            <select
              id="i-category"
              className={inputCls}
              value={category}
              onChange={(e) => setCategory(e.target.value as IngredientCategory)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t(`categories.${c}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls} htmlFor="i-unit">
              {t("ingredients.unit")}
            </label>
            <select
              id="i-unit"
              className={inputCls}
              value={unit}
              onChange={(e) => setUnit(e.target.value as IngredientUnit)}
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {t(`units.${u}`)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls} htmlFor="i-min">
              {t("ingredients.minStock")}
            </label>
            <input
              id="i-min"
              type="number"
              min={0}
              step="any"
              className={inputCls}
              required
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
          </div>
          {isEdit ? (
            <div>
              <label className={labelCls} htmlFor="i-cur">
                {t("ingredients.currentStock")}
              </label>
              <input
                id="i-cur"
                className={inputCls + " cursor-not-allowed opacity-60"}
                value={editing.currentStock}
                readOnly
                disabled
              />
            </div>
          ) : (
            <div>
              <label className={labelCls} htmlFor="i-init">
                {t("ingredients.initialStock")}
              </label>
              <input
                id="i-init"
                type="number"
                min={0}
                step="any"
                className={inputCls}
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-terracotta-400">
          {isEdit
            ? t("ingredients.stockReadOnlyNote")
            : t("ingredients.stockManagedNote")}
        </p>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 font-semibold text-terracotta-600 hover:bg-terracotta-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white hover:bg-terracotta-600 disabled:opacity-60"
          >
            {submitting ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
