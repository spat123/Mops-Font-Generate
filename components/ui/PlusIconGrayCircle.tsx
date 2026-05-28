import { PlusIcon } from './CommonIcons';

export type PlusIconGrayCircleProps = {
  className?: string;
  active?: boolean;
  iconClassName?: string;
};

/**
 * Цвет плюса при наведении на предка с классом `group` (например карточка загрузки).
 */
export function PlusIconGrayCircle({ className = '', active = false, iconClassName = '' }: PlusIconGrayCircleProps) {
  return (
    <div
      className={`flex h-10 w-10 text-gray-800 items-center justify-center rounded-full transition-colors group-hover:bg-accent group-hover:text-white ${
        active ? 'bg-accent text-white' : 'bg-gray-50 text-gray-800'
      } ${className}`.trim()}
    >
      <PlusIcon className={`h-5 w-5 ${iconClassName}`.trim()} />
    </div>
  );
}
