import { EditAssetIcon } from './EditAssetIcon';
import { heartIconUrl } from './editIconUrls';

export type SupportProjectButtonProps = {
  onClick: () => void;
  className?: string;
  fullWidth?: boolean;
};

export function SupportProjectButton({ onClick, className = '', fullWidth = false }: SupportProjectButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-12 cursor-pointer items-center justify-center gap-2 bg-white px-4 text-xs font-bold uppercase text-gray-900 transition-colors hover:text-accent focus:outline-none focus-visible:ring-2 focus-visible:ring-black/20 ${
        fullWidth ? 'w-full' : ''
      } ${className}`.trim()}
    >
      <EditAssetIcon src={heartIconUrl} className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">Поддержать проект</span>
    </button>
  );
}
