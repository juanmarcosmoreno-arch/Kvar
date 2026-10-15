import { dismissToast, useToast } from '../store/toast';

export function ToastView() {
  const t = useToast();
  if (!t) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] z-[60] flex justify-center px-4">
      <div
        key={t.id}
        role="status"
        className="animate-fade pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl bg-ink px-4 py-2 text-bg shadow-lg"
      >
        <span className="flex-1 py-1.5 text-sm">{t.message}</span>
        {t.action && (
          <button
            className="min-h-tap shrink-0 px-2 text-sm font-bold text-lime"
            onClick={() => {
              t.action!.run();
              dismissToast();
            }}
          >
            {t.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
