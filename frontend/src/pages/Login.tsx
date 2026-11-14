import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { ApiError } from "../lib/api";

export function Login() {
  const { t } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError(t("login.invalidCredentials"));
      } else {
        setError(t("login.genericError"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-cream">
      <header className="flex items-center justify-between p-4">
        <span className="text-lg font-bold text-terracotta-600">
          ☕ {t("common.appName")}
        </span>
        <LanguageSwitcher />
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-terracotta-700">
              {t("login.title")}
            </h1>
            <p className="mt-2 text-terracotta-500">{t("login.subtitle")}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-terracotta-100"
          >
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-semibold text-terracotta-700"
              >
                {t("login.email")}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("login.emailPlaceholder")}
                className="w-full rounded-lg border border-terracotta-200 bg-cream px-3 py-2.5 text-terracotta-900 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-semibold text-terracotta-700"
              >
                {t("login.password")}
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("login.passwordPlaceholder")}
                className="w-full rounded-lg border border-terracotta-200 bg-cream px-3 py-2.5 text-terracotta-900 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-terracotta-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? t("login.submitting") : t("login.submit")}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
