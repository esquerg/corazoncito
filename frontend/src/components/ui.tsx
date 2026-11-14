import type { ReactNode } from "react";

export const inputCls =
  "w-full rounded-lg border border-terracotta-200 bg-cream px-3 py-2.5 text-terracotta-900 outline-none focus:border-terracotta-500 focus:ring-2 focus:ring-terracotta-200";

export const labelCls = "mb-1 block text-sm font-semibold text-terracotta-700";

export function ModalShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-lg font-bold text-terracotta-800">{title}</h2>
        {children}
      </div>
    </div>
  );
}
