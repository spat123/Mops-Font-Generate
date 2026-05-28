export type CatalogRowHeaderProps = {
  family: string;
  metaItems?: string[];
  className?: string;
  familyClassName?: string;
  metaClassName?: string;
  /** Страница share: мета вправо по краю строки */
  metaTrailingEdge?: boolean;
};

/**
 * Заголовок строки каталога ROW: имя семейства и мета.
 */
export function CatalogRowHeader({
  family,
  metaItems = [],
  className = '',
  familyClassName = 'min-w-0 max-w-full truncate text-left text-xs font-medium leading-tight text-gray-800 sm:text-sm',
  metaClassName = 'flex min-w-0 w-[min(100%,44rem)] flex-nowrap items-center justify-start gap-x-2 text-left text-sm font-semibold uppercase leading-tight text-black sm:gap-x-3',
  metaTrailingEdge = false,
}: CatalogRowHeaderProps) {
  const normalizedMeta = (Array.isArray(metaItems) ? metaItems : [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  if (metaTrailingEdge) {
    return (
      <div className={`w-full min-w-0 shrink-0 ${className}`.trim()}>
        <div className="flex w-full min-w-0 flex-col gap-y-3 sm:gap-y-4 lg:flex-row lg:items-baseline lg:justify-between lg:gap-x-6">
          <div className={`${familyClassName} min-w-0 max-w-full lg:min-w-0 lg:shrink`}>{family}</div>
          {normalizedMeta.length > 0 ? (
            <div
              className={`${metaClassName} mt-0.5 flex min-w-0 flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right sm:gap-x-3 lg:mt-0 lg:max-w-[min(100%,58%)] lg:justify-end`.trim()}
            >
              {normalizedMeta.map((item, index) => (
                <span key={`${item}-${index}`} className="min-w-0 truncate whitespace-nowrap">
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-w-0 shrink-0 ${className}`.trim()}>
      <div className="grid w-full min-w-0 grid-cols-1 gap-y-3 sm:gap-y-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,44rem)_minmax(0,1fr)] xl:items-center xl:gap-y-0">
        <div className={`${familyClassName} min-w-0 w-full max-w-full`}>{family}</div>
        {normalizedMeta.length > 0 ? (
          <div
            className={`${metaClassName} mt-0.5 grid w-full min-w-0 max-w-full grid-cols-2 gap-x-4 gap-y-2 xl:col-start-2 xl:mt-0 xl:flex xl:w-[min(100%,44rem)] xl:flex-nowrap xl:gap-x-3 xl:gap-y-0`}
          >
            {normalizedMeta.map((item, index) => (
              <span key={`${item}-${index}`} className="min-w-0 truncate whitespace-nowrap xl:shrink-0">
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
