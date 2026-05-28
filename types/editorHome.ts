import type { ReactNode } from 'react';

/** Пропсы для `EditorHomeLayout` (собираются на странице редактора). */
export type EditorHomeLayoutProps = {
  cssString: string;
  modals: {
    export: Record<string, unknown>;
    generate: Record<string, unknown>;
    libraryShare: Record<string, unknown>;
  };
  fileUpload: {
    inputRef: React.RefObject<HTMLInputElement | null>;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void | Promise<void>;
  };
  sidebar: Record<string, unknown>;
  tabBar: Record<string, unknown> & { tabBarEndActions: ReactNode };
  preview: Record<string, unknown>;
  libraryScreenProps: Record<string, unknown>;
  libraryCreateDialog: Record<string, unknown>;
};
