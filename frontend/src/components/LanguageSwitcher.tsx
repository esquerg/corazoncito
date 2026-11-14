import { useTranslation } from "react-i18next";
import { SUPPORTED_LANGS } from "../i18n";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? "es";

  return (
    <div
      className="inline-flex overflow-hidden rounded-full border border-terracotta-200 text-xs font-semibold"
      role="group"
      aria-label="Language"
    >
      {SUPPORTED_LANGS.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => i18n.changeLanguage(lng)}
          className={
            "px-3 py-1.5 uppercase transition-colors " +
            (current === lng
              ? "bg-terracotta-500 text-white"
              : "bg-white text-terracotta-600 hover:bg-terracotta-50")
          }
          aria-pressed={current === lng}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
