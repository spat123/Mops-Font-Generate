import type { SavedLibraryRecord } from './editorFonts';
import type { SavedLibraryFontEntry } from './savedLibrary';

export type LibraryCreateDialogRequest = {
  requestId: string;
  mode: 'create' | 'edit';
  selectedFonts?: SavedLibraryFontEntry[];
  library?: SavedLibraryRecord | null;
};
