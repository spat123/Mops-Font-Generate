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
  console.log(`[ServerUtils] Ищем корень проекта, начиная с: ${startDir}`);
  
  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    try {
      await fs.access(packageJsonPath, fs.constants.F_OK);
      console.log(`[ServerUtils] Найден корень проекта: ${currentDir}`);
      return currentDir; // Нашли package.json, это корень
    } catch (e) {
      // Игнорируем ошибку и идем на уровень выше
    }
    currentDir = path.dirname(currentDir);
  }
  console.error(`[ServerUtils] Корень проекта не найден, начиная с: ${startDir}`);
  return null; // Дошли до корня файловой системы и не нашли
}

/**
 * Находит абсолютный путь к корневой директории пакета Fontsource,
 * находя корень проекта и строя путь вручную.
 * @param {string} packageName - Имя пакета БЕЗ префикса @fontsource/ (например, 'roboto').
 * @returns {Promise<string|null>} - Абсолютный путь или null, если пакет/metadata.json не найден.
 */
export async function findFontsourcePackagePath(packageName) {
  console.log(`[ServerUtils] Поиск пакета: ${packageName}`);
  
  const projectRoot = await findProjectRoot(__dirname);
  if (!projectRoot) {
    console.error("[ServerUtils] Не удалось найти корневую директорию проекта (package.json).");
    return null;
  }

  // Проверяем, не ищем ли мы вариативный пакет
  const isVariableRequest = packageName.startsWith('variable/');
  const baseName = isVariableRequest ? packageName.substring(9) : packageName;
  
  // Пути к обычному и вариативному пакетам
  const normalPackageName = `@fontsource/${baseName}`;
  const variablePackageName = `@fontsource-variable/${baseName}`;
  
  console.log(`[ServerUtils] Проверяем пакеты: ${normalPackageName}, ${variablePackageName}`);
  
  let packageDir;
  let metadataPath;
  
  // Если запрос явно для вариативного пакета, пробуем его сначала
  if (isVariableRequest) {
    packageDir = path.join(projectRoot, 'node_modules', variablePackageName);
    metadataPath = path.join(packageDir, 'metadata.json');
    console.log(`[ServerUtils] Проверяем вариативный пакет: ${metadataPath}`);
    
    try {
      await fs.access(metadataPath, fs.constants.F_OK);
      console.log(`[ServerUtils] ✅ Найден вариативный пакет ${variablePackageName} в: ${packageDir}`);
      return packageDir;
    } catch (error) {
      console.warn(`[ServerUtils] ⚠️ Вариативный пакет ${variablePackageName} не найден: ${error.message}`);
      // Если не нашли вариативный, продолжаем поиск обычного пакета
    }
  }
  
  // Ищем обычный пакет
  packageDir = path.join(projectRoot, 'node_modules', normalPackageName);
  metadataPath = path.join(packageDir, 'metadata.json');
  
  console.log(`[ServerUtils] Проверяем обычный пакет: ${metadataPath}`);
  
  try {
    // Проверяем доступность metadata.json по построенному пути
    await fs.access(metadataPath, fs.constants.F_OK);
    console.log(`[ServerUtils] ✅ Найден пакет ${normalPackageName} в: ${packageDir}`);
    return packageDir; // Возвращаем путь к директории пакета
  } catch (error) {
    console.warn(`[ServerUtils] ⚠️ Обычный пакет ${normalPackageName} не найден: ${error.message}`);
    
    // Если не запрашивали явно вариативный, попробуем его теперь
    if (!isVariableRequest) {
      packageDir = path.join(projectRoot, 'node_modules', variablePackageName);
      metadataPath = path.join(packageDir, 'metadata.json');
      console.log(`[ServerUtils] Проверяем вариативный пакет (fallback): ${metadataPath}`);
      
      try {
        await fs.access(metadataPath, fs.constants.F_OK);
        console.log(`[ServerUtils] ✅ Найден вариативный пакет ${variablePackageName} в: ${packageDir}`);
        return packageDir;
      } catch (variableError) {
        console.error(`[ServerUtils] ❌ Не найдены пакеты ${normalPackageName} и ${variablePackageName}`);
        console.error(`[ServerUtils] Попытки поиска:`);
        console.error(`[ServerUtils] - ${path.join(projectRoot, 'node_modules', normalPackageName, 'metadata.json')}`);
        console.error(`[ServerUtils] - ${path.join(projectRoot, 'node_modules', variablePackageName, 'metadata.json')}`);
      }
    }
    return null;
  }
} 