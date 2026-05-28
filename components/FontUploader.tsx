import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from '../utils/appNotify';
import { PlusIconGrayCircle } from './ui/PlusIconGrayCircle';

export type UploadedFontFile = {
  file: File;
  name: string;
  url: string;
};

export type FontUploaderProps = {
  onFontsUploaded: (files: UploadedFontFile[]) => void;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ACCEPTED_FONT_TYPES = [
  'font/ttf',
  'font/otf',
  'font/woff',
  'font/woff2',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/font-woff',
  'application/font-woff2',
  'application/vnd.ms-fontobject',
  'application/font-sfnt',
];
const VALID_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];

function isFontFileByExtension(fileName: string) {
  return VALID_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

export default function FontUploader({ onFontsUploaded }: FontUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setIsUploading(true);

      try {
        const validFiles: UploadedFontFile[] = [];
        const invalidFiles: { file: File; reason: 'size' | 'type' }[] = [];

        for (const file of acceptedFiles) {
          if (file.size > MAX_FILE_SIZE) {
            invalidFiles.push({ file, reason: 'size' });
            continue;
          }

          if (!ACCEPTED_FONT_TYPES.includes(file.type) && !isFontFileByExtension(file.name)) {
            invalidFiles.push({ file, reason: 'type' });
            continue;
          }

          validFiles.push({
            file,
            name: file.name,
            url: URL.createObjectURL(file),
          });
        }

        if (invalidFiles.length > 0) {
          invalidFiles.forEach(({ file, reason }) => {
            if (reason === 'size') {
              toast.warning(`Файл "${file.name}" превышает максимальный размер (50 МБ)`, {
                position: 'bottom-right',
              });
            } else if (reason === 'type') {
              toast.warning(
                `Файл "${file.name}" не является допустимым форматом шрифта (TTF, OTF, WOFF, WOFF2)`,
                { position: 'bottom-right' },
              );
            }
          });
        }

        if (validFiles.length > 0) {
          onFontsUploaded(validFiles);

          if (validFiles.length === 1) {
            toast.success(`Шрифт "${validFiles[0].name}" успешно загружен`, {
              position: 'bottom-right',
            });
          } else {
            toast.success(`Успешно загружено ${validFiles.length} шрифтов`, {
              position: 'bottom-right',
            });
          }
        } else {
          toast.error('Ни один из выбранных файлов не является допустимым шрифтом', {
            position: 'bottom-right',
          });
        }
      } catch (error) {
        console.error('Ошибка при загрузке шрифтов:', error);
        const message = error instanceof Error ? error.message : String(error);
        toast.error(`Ошибка при загрузке шрифтов: ${message}`, {
          position: 'bottom-right',
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onFontsUploaded],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'font/ttf': ['.ttf'],
      'font/otf': ['.otf'],
      'font/woff': ['.woff'],
      'font/woff2': ['.woff2'],
      'application/x-font-ttf': ['.ttf'],
      'application/x-font-otf': ['.otf'],
      'application/font-woff': ['.woff'],
      'application/font-woff2': ['.woff2'],
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`group select-none cursor-pointer p-4 border-2 border-dashed rounded-lg transition-all ${
        isDragActive ? 'border-gray-500 bg-gray-100' : 'border-gray-300 hover:bg-gray-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-2 py-1">
        <PlusIconGrayCircle active={isDragActive} />
        <div className={`text-sm font-medium ${isDragActive ? 'text-gray-800' : 'text-gray-700'}`}>
          {isDragActive ? 'Отпустите файлы' : 'Загрузить шрифт'}
        </div>
        <div className="text-xs text-gray-500">TTF, OTF, WOFF или WOFF2</div>
      </div>
    </div>
  );
}
