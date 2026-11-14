import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "../components/Layout";
import { ModalShell, inputCls, labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type { Supplier } from "../lib/types";

type Toast = { kind: "ok" | "error"; text: string } | null;

function errorText(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) return err.message;
  return t("suppliers.genericError");
}

export function Suppliers() {
  const { t } = useTranslation();

  const [items, setItems] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { suppliers } = await api.listSuppliers();
      setItems(suppliers);
    } catch {
      setToast({ kind: "error", text: t("suppliers.genericError") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(item: Supplier) {
    if (!window.confirm(t("suppliers.confirmDelete", { name: item.name }))) return;
    try {
      await api.deleteSupplier(item.id);
      setToast({ kind: "ok", text: t("suppliers.deletedOk") });
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
            {t("suppliers.title")}
          </h1>
          <p className="mt-1 text-sm text-terracotta-500">
            {t("suppliers.subtitle")}
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
          + {t("suppliers.newSupplier")}
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
          <p className="p-6 text-terracotta-500">{t("suppliers.empty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("suppliers.name")}</th>
                <th className="px-4 py-3 font-semibold">{t("suppliers.contact")}</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">
                  {t("suppliers.notes")}
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("suppliers.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-terracotta-50 last:border-0">
                  <td className="px-4 py-3 font-medium text-terracotta-900">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-terracotta-600">
                    {item.contact || "—"}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-3 text-terracotta-500 md:table-cell">
                    {item.notes || "—"}
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
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formOpen && (
        <SupplierFormModal
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

function SupplierFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Supplier | null;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const isEdit = editing !== null;

  const [name, setName] = useState(editing?.name ?? "");
  const [contact, setContact] = useState(editing?.contact ?? "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      name,
      contact: contact.trim() || null,
      notes: notes.trim() || null,
    };
    try {
      if (isEdit) {
        await api.updateSupplier(editing.id, payload);
        onSaved(t("suppliers.updatedOk"));
      } else {
        await api.createSupplier(payload);
        onSaved(t("suppliers.createdOk"));
      }
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={isEdit ? t("suppliers.editTitle") : t("suppliers.createTitle")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="s-name">
            {t("suppliers.name")}
          </label>
          <input
            id="s-name"
            className={inputCls}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="s-contact">
            {t("suppliers.contact")}
          </label>
          <input
            id="s-contact"
            className={inputCls}
            placeholder={t("suppliers.contactPlaceholder")}
            value={contact}
            onChange={(e) => setContact(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="s-notes">
            {t("suppliers.notes")}
          </label>
          <textarea
            id="s-notes"
            className={inputCls + " min-h-20 resize-y"}
            placeholder={t("suppliers.notesPlaceholder")}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

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
