import { toast } from '../../utils/appNotify';

export function notifyFontAlreadyInLibrary(fontLabel, libraryName) {
  toast.info(`Шрифт «${fontLabel}» уже в библиотеке «${libraryName}»`);
}

export function notifyFontMovedToLibrary(fontLabel, libraryName) {
  toast.success(`Шрифт «${fontLabel}» перенесен в «${libraryName}»`);
}

