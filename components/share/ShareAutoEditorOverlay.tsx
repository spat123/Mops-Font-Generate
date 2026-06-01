import { HexProgressLoader } from '../ui/HexProgressLoader';

/** Полноэкранный оверлей при переходе share → редактор (`autoEditor=1`). */
export function ShareAutoEditorOverlay() {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-white/75 backdrop-blur-md"
      role="status"
      aria-live="polite"
      aria-label="Открываем шрифт в редакторе"
    >
      <div className="flex flex-col items-center gap-5 px-6 text-center">
        <HexProgressLoader size={72} className="shrink-0" />
        <p className="max-w-xs text-xs font-semibold uppercase tracking-wide text-gray-700">
          Открываем шрифт в редакторе…
        </p>
      </div>
    </div>
  );
}
