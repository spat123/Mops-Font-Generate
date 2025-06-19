import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';

export default function FontUploader({ onFontsUploaded }) {
  const [isUploading, setIsUploading] = useState(false);

  // Максимальный размер файла шрифта (50 МБ)
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  // Допустимые типы файлов шрифтов
  const ACCEPTED_FONT_TYPES = [
    'font/ttf', 'font/otf', 'font/woff', 'font/woff2',
    'application/x-font-ttf', 'application/x-font-otf',
    'application/font-woff', 'application/font-woff2',
    'application/vnd.ms-fontobject', 'application/font-sfnt'
  ];
  // Допустимые расширения файлов шрифтов
  const VALID_EXTENSIONS = ['.ttf', '.otf', '.woff', '.woff2'];

  // Проверка, является ли файл шрифтом по расширению
  const isFontFileByExtension = (fileName) => {
    return VALID_EXTENSIONS.some(ext => fileName.toLowerCase().endsWith(ext));
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    if (acceptedFiles.length === 0) return;
    
    setIsUploading(true);
    
    try {
      // Фильтруем файлы, проверяя их на соответствие типам и размеру
      const validFiles = [];
      const invalidFiles = [];
      
      for (const file of acceptedFiles) {
        // Проверка размера файла
        if (file.size > MAX_FILE_SIZE) {
          invalidFiles.push({ file, reason: 'size' });
          continue;
        }
        
        // Проверка типа файла - и по MIME-типу, и по расширению
        if (!ACCEPTED_FONT_TYPES.includes(file.type) && !isFontFileByExtension(file.name)) {
          invalidFiles.push({ file, reason: 'type' });
          continue;
        }
        
        // Добавляем валидный файл
        validFiles.push({
          file,
          name: file.name,
          url: URL.createObjectURL(file)
        });
      }
      
      // Показываем предупреждения о невалидных файлах
      if (invalidFiles.length > 0) {
        invalidFiles.forEach(({ file, reason }) => {
          if (reason === 'size') {
            toast.warning(`Файл "${file.name}" превышает максимальный размер (50 МБ)`, {
              position: "bottom-right"
            });
          } else if (reason === 'type') {
            toast.warning(`Файл "${file.name}" не является допустимым форматом шрифта (TTF, OTF, WOFF, WOFF2)`, {
              position: "bottom-right"
            });
          }
        });
      }
      
      // Если есть валидные файлы, передаем их для обработки
      if (validFiles.length > 0) {
        onFontsUploaded(validFiles);
        
        // Показываем уведомление об успехе
        if (validFiles.length === 1) {
          toast.success(`Шрифт "${validFiles[0].name}" успешно загружен`, {
            position: "bottom-right"
          });
        } else {
          toast.success(`Успешно загружено ${validFiles.length} шрифтов`, {
            position: "bottom-right"
          });
        }
      } else {
        toast.error('Ни один из выбранных файлов не является допустимым шрифтом', {
          position: "bottom-right"
        });
      }
    } catch (error) {
      console.error('Ошибка при загрузке шрифтов:', error);
      toast.error(`Ошибка при загрузке шрифтов: ${error.message}`, {
        position: "bottom-right"
      });
    } finally {
      setIsUploading(false);
    }
  }, [onFontsUploaded]);

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
      'application/font-woff2': ['.woff2']
    },
    multiple: true,
  });

  return (
    <div
      {...getRootProps()}
      className={`p-4 border-2 border-dashed rounded-md transition-all ${
        isDragActive 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'
      }`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center space-y-2 py-1">
        <svg
          className={`w-6 h-6 ${isDragActive ? 'text-blue-500' : 'text-blue-400'}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <div className={`text-sm font-medium ${isDragActive ? 'text-blue-600' : 'text-blue-500'}`}>
          {isDragActive 
            ? 'Отпустите файлы' 
            : 'Загрузить шрифт'}
        </div>
        <div className="text-xs text-gray-500">
          TTF, OTF, WOFF или WOFF2
        </div>
      </div>
    </div>
  );
}