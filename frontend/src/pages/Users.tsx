import { useEffect, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { Layout } from "../components/Layout";
import { ModalShell, inputCls, labelCls } from "../components/ui";
import { api, ApiError } from "../lib/api";
import type { Role, User } from "../lib/types";

const ROLES: Role[] = ["owner", "manager", "barista"];

type Toast = { kind: "ok" | "error"; text: string } | null;

export function Users() {
  const { t } = useTranslation();
  const { user: me } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [resetting, setResetting] = useState<User | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { users } = await api.listUsers();
      setUsers(users);
    } catch {
      setToast({ kind: "error", text: t("users.genericError") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(u: User) {
    setEditing(u);
    setFormOpen(true);
  }

  async function handleDelete(u: User) {
    if (!window.confirm(t("users.confirmDelete", { name: u.name }))) return;
    try {
      await api.deleteUser(u.id);
      setToast({ kind: "ok", text: t("users.deletedOk") });
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
            {t("users.title")}
          </h1>
          <p className="mt-1 text-sm text-terracotta-500">{t("users.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-terracotta-600"
        >
          + {t("users.newUser")}
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
        ) : users.length === 0 ? (
          <p className="p-6 text-terracotta-500">{t("users.empty")}</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-terracotta-100 bg-sand text-terracotta-700">
              <tr>
                <th className="px-4 py-3 font-semibold">{t("users.name")}</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">
                  {t("users.email")}
                </th>
                <th className="px-4 py-3 font-semibold">{t("users.role")}</th>
                <th className="px-4 py-3 font-semibold">{t("users.status")}</th>
                <th className="px-4 py-3 text-right font-semibold">
                  {t("users.actions")}
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-terracotta-50 last:border-0"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-terracotta-900">
                      {u.name}
                      {me?.id === u.id && (
                        <span className="ml-2 rounded-full bg-terracotta-100 px-2 py-0.5 text-xs font-semibold text-terracotta-600">
                          {t("users.you")}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-terracotta-400 sm:hidden">
                      {u.email}
                    </div>
                  </td>
                  <td className="hidden px-4 py-3 text-terracotta-600 sm:table-cell">
                    {u.email}
                  </td>
                  <td className="px-4 py-3 text-terracotta-700">
                    {t(`roles.${u.role}`)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        "inline-flex items-center gap-1.5 text-xs font-semibold " +
                        (u.active ? "text-green-700" : "text-terracotta-400")
                      }
                    >
                      <span
                        className={
                          "h-2 w-2 rounded-full " +
                          (u.active ? "bg-green-500" : "bg-terracotta-300")
                        }
                      />
                      {u.active ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2 text-xs font-semibold">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded-md px-2 py-1 text-terracotta-600 hover:bg-terracotta-50"
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setResetting(u)}
                        className="rounded-md px-2 py-1 text-terracotta-600 hover:bg-terracotta-50"
                      >
                        {t("users.resetPassword")}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(u)}
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
        <UserFormModal
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(text) => {
            setFormOpen(false);
            setToast({ kind: "ok", text });
            void load();
          }}
        />
      )}

      {resetting && (
        <ResetPasswordModal
          user={resetting}
          onClose={() => setResetting(null)}
          onSaved={(text) => {
            setResetting(null);
            setToast({ kind: "ok", text });
          }}
        />
      )}
    </Layout>
  );
}

function errorText(err: unknown, t: (k: string) => string): string {
  if (err instanceof ApiError) return err.message;
  return t("users.genericError");
}

function UserFormModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: User | null;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const isEdit = editing !== null;

  const [name, setName] = useState(editing?.name ?? "");
  const [email, setEmail] = useState(editing?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>(editing?.role ?? "barista");
  const [active, setActive] = useState(editing?.active ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        await api.updateUser(editing.id, { name, email, role, active });
        onSaved(t("users.updatedOk"));
      } else {
        await api.createUser({ name, email, password, role, active });
        onSaved(t("users.createdOk"));
      }
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={isEdit ? t("users.editTitle") : t("users.createTitle")}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="u-name">
            {t("users.name")}
          </label>
          <input
            id="u-name"
            className={inputCls}
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls} htmlFor="u-email">
            {t("users.email")}
          </label>
          <input
            id="u-email"
            type="email"
            className={inputCls}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        {!isEdit && (
          <div>
            <label className={labelCls} htmlFor="u-password">
              {t("users.password")}
            </label>
            <input
              id="u-password"
              type="password"
              className={inputCls}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-terracotta-400">
              {t("users.passwordHint")}
            </p>
          </div>
        )}
        <div>
          <label className={labelCls} htmlFor="u-role">
            {t("users.role")}
          </label>
          <select
            id="u-role"
            className={inputCls}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {t(`roles.${r}`)}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium text-terracotta-700">
          <input
            type="checkbox"
            className="h-4 w-4 accent-terracotta-500"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t("common.active")}
        </label>

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

function ResetPasswordModal({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const { t } = useTranslation();
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.resetUserPassword(user.id, newPassword);
      onSaved(t("users.passwordResetOk"));
    } catch (err) {
      setError(errorText(err, t));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell
      title={t("users.resetPasswordTitle", { name: user.name })}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelCls} htmlFor="u-newpass">
            {t("users.newPassword")}
          </label>
          <input
            id="u-newpass"
            type="password"
            className={inputCls}
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <p className="mt-1 text-xs text-terracotta-400">
            {t("users.passwordHint")}
          </p>
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
