import type { MouseEvent } from 'react';
import { IconCircleButton } from '../ui/IconCircleButton';
import CatalogSessionAddSpinner from '../ui/CatalogSessionAddSpinner';
import { PlusIcon } from '../ui/CommonIcons';

function CheckMarkIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-white" aria-hidden>
      <path
        d="M4.5 10.5L8.25 14.25L15.5 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type SavedLibraryCatalogAddCornerProps = {
  alreadyInLibrary?: boolean;
  busy?: boolean;
  done?: boolean;
  doneClassName?: string;
  onAdd: () => void;
};

/** Кнопка «добавить в библиотеку» на карточке результата поиска каталога. */
export function SavedLibraryCatalogAddCorner({
  alreadyInLibrary,
  busy,
  done,
  doneClassName = '!bg-accent !text-white [&_svg]:!text-white',
  onAdd,
}: SavedLibraryCatalogAddCornerProps) {
  return (
    <IconCircleButton
      variant="gray100Menu"
      size="sm"
      pressed={busy || done}
      className={done ? doneClassName : ''}
      disabled={alreadyInLibrary || busy}
      aria-label={alreadyInLibrary ? 'Уже в библиотеке' : 'Добавить в библиотеку'}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        if (alreadyInLibrary || busy) return;
        onAdd();
      }}
    >
      {busy ? (
        <CatalogSessionAddSpinner className="text-accent" />
      ) : done ? (
        <CheckMarkIcon />
      ) : (
        <PlusIcon className="h-4 w-4" />
      )}
    </IconCircleButton>
  );
}
