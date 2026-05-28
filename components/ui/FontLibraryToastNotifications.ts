import { toast } from '../../utils/appNotify';

export function notifyFontAlreadyInLibrary(fontLabel: string, libraryName: string) {
  toast.info(`Шрифт «${fontLabel}» уже в библиотеке «${libraryName}»`);
}

export function notifyFontMovedToLibrary(fontLabel: string, libraryName: string) {
  toast.success(`Шрифт «${fontLabel}» перенесен в «${libraryName}»`);
}
