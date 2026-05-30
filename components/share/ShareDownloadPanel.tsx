import Link from 'next/link';
import { AuthLogoLink } from '../auth/AuthSplitLayout';
import { EDITOR_BETA_VERSION } from '../../data/editorNewsFeed';
import { PlusIcon } from '../ui/CommonIcons';
import { EditAssetIcon } from '../ui/EditAssetIcon';
import { downloudIconUrl, heartIconUrl } from '../ui/editIconUrls';
import { AppButton } from '../ui/AppButton';

export type ShareFontStats = {
  total?: number;
  static?: number;
  variable?: number;
};

function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-gray-900 py-3 last:border-b-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-gray-900">{label}</span>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-gray-900">{value}</span>
    </div>
  );
}

export type ShareDownloadPanelProps = {
  stats?: ShareFontStats | null;
  catalogDownloadableCount?: number;
  importBusy?: boolean;
  zipBusy?: boolean;
  isShareOwner?: boolean;
  isAuthenticated?: boolean;
  onImport?: () => void;
  onZip?: () => void;
  onSignIn?: () => void;
};

export function ShareDownloadPanel({
  stats,
  catalogDownloadableCount = 0,
  importBusy = false,
  zipBusy = false,
  isShareOwner = false,
  isAuthenticated = false,
  onImport,
  onZip,
  onSignIn,
}: ShareDownloadPanelProps) {
  const { total = 0, static: staticCount = 0, variable: variableCount = 0 } = stats || {};
  const importLabel = isShareOwner ? 'Открыть в редакторе' : 'Сохранить в редактор';
  const importBusyLabel = isShareOwner ? 'Открываем…' : 'Сохранение…';

  return (
    <div className="flex min-h-full w-full flex-col">
      <p className="shrink-0 text-center">
        <span className="inline-flex rounded-full border border-gray-900 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-900">
          Beta {EDITOR_BETA_VERSION}
        </span>
      </p>

      <div className="flex min-h-0 flex-1 flex-col justify-center">
        <AuthLogoLink className="mb-10 mt-8" />

        <h1 className="text-center text-xl font-bold uppercase tracking-tight text-gray-900 md:text-2xl">
          Скачивание
        </h1>
        <p className="mt-2 text-center text-sm font-normal leading-relaxed text-gray-500">
          С вами поделились шрифтами
          <br />
          в количестве (шт.):
        </p>

        <p
          className="mt-8 text-center text-6xl font-bold leading-none tabular-nums tracking-tight text-gray-900 md:text-7xl"
          aria-label={`Всего шрифтов: ${total}`}
        >
          {total}
        </p>

        {staticCount > 0 || variableCount > 0 ? (
          <div className="mt-8">
            {staticCount > 0 ? <StatRow label="Статических" value={staticCount} /> : null}
            {variableCount > 0 ? <StatRow label="Вариативных" value={variableCount} /> : null}
          </div>
        ) : null}

        {catalogDownloadableCount > 0 && catalogDownloadableCount < total ? (
          <p className="mt-4 text-center text-[11px] font-medium uppercase leading-snug text-gray-400">
            В архив и редактор: {catalogDownloadableCount} из каталога
          </p>
        ) : null}

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            disabled={importBusy}
            onClick={onImport}
            className="inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 text-xs font-bold uppercase text-gray-900 transition-colors hover:border-black/[0.9] hover:bg-black/[0.9] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlusIcon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{importBusy ? importBusyLabel : importLabel}</span>
          </button>

          {!isShareOwner && !isAuthenticated ? (
            <AppButton type="button" variant="link" fullWidth onClick={onSignIn}>
              Войти, чтобы сохранить
            </AppButton>
          ) : null}

          <AppButton
            type="button"
            variant="accent"
            fullWidth
            disabled={zipBusy}
            onClick={onZip}
            className="!mt-0 !h-12 !rounded-lg !text-xs !font-bold"
          >
            <EditAssetIcon src={downloudIconUrl} className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{zipBusy ? 'Сборка…' : 'Скачать все (ZIP)'}</span>
          </AppButton>
        </div>
      </div>

      <div className="mt-auto mx-auto shrink-0 pt-10">
        <Link
          href="/"
          className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 bg-white px-4 text-xs font-bold uppercase text-gray-900 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
        >
          <EditAssetIcon src={heartIconUrl} className="h-4 w-4 shrink-0" aria-hidden />
          <span className="truncate">Поддержать проект</span>
        </Link>
      </div>
    </div>
  );
}
