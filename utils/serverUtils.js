import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// Получаем путь к текущей директории (работает и в ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Асинхронно находит корневую директорию проекта, ища package.json вверх по дереву.
 * @param {string} startDir - Директория, с которой начать поиск.
 * @returns {Promise<string|null>} - Путь к корневой директории или null, если не найден.
 */
async function findProjectRoot(startDir) {
  let currentDir = startDir;
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    try {
      await fs.access(packageJsonPath, fs.constants.F_OK);
      return currentDir; // Нашли package.json, это корень
    } catch (e) {
      // Игнорируем ошибку и идем на уровень выше
    }
    currentDir = path.dirname(currentDir);
  }
  return null; // Дошли до корня файловой системы и не нашли
}

/**
 * Находит абсолютный путь к корневой директории пакета Fontsource,
 * находя корень проекта и строя путь вручную.
 * @param {string} packageName - Имя пакета БЕЗ префикса @fontsource/ (например, 'roboto').
 * @returns {Promise<string|null>} - Абсолютный путь или null, если пакет/metadata.json не найден.
 */
export async function findFontsourcePackagePath(packageName) {
  const projectRoot = await findProjectRoot(__dirname);
  if (!projectRoot) {
    console.error("Не удалось найти корневую директорию проекта (package.json).");
    return null;
  }

  // Проверяем, не ищем ли мы вариативный пакет
  const isVariableRequest = packageName.startsWith('variable/');
  const baseName = isVariableRequest ? packageName.substring(9) : packageName;
  
  // Пути к обычному и вариативному пакетам
  const normalPackageName = `@fontsource/${baseName}`;
  const variablePackageName = `@fontsource-variable/${baseName}`;
  
  let packageDir;
  let metadataPath;
  
  // Если запрос явно для вариативного пакета, пробуем его сначала
  if (isVariableRequest) {
    packageDir = path.join(projectRoot, 'node_modules', variablePackageName);
    metadataPath = path.join(packageDir, 'metadata.json');
    try {
      await fs.access(metadataPath, fs.constants.F_OK);
      console.log(`Найден вариативный пакет ${variablePackageName} в: ${packageDir}`);
      return packageDir;
    } catch (error) {
      console.warn(`Вариативный пакет ${variablePackageName} не найден, пробуем обычный...`);
      // Если не нашли вариативный, продолжаем поиск обычного пакета
    }
  }
  
  // Ищем обычный пакет
  packageDir = path.join(projectRoot, 'node_modules', normalPackageName);
  metadataPath = path.join(packageDir, 'metadata.json');
  
  try {
    // Проверяем доступность metadata.json по построенному пути
    await fs.access(metadataPath, fs.constants.F_OK);
    console.log(`Найден пакет ${normalPackageName} в: ${packageDir}`);
    return packageDir; // Возвращаем путь к директории пакета
  } catch (error) {
    // Если не запрашивали явно вариативный, попробуем его теперь
    if (!isVariableRequest) {
      packageDir = path.join(projectRoot, 'node_modules', variablePackageName);
      metadataPath = path.join(packageDir, 'metadata.json');
      try {
        await fs.access(metadataPath, fs.constants.F_OK);
        console.log(`Найден вариативный пакет ${variablePackageName} в: ${packageDir}`);
        return packageDir;
      } catch (variableError) {
        console.warn(`Не найдены пакеты ${normalPackageName} и ${variablePackageName}`);
      }
    }
    return null;
  }
} 