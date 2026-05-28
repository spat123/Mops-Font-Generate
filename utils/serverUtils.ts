import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function findProjectRoot(startDir: string): Promise<string | null> {
  let currentDir = startDir;

  const vercelPaths = [
    '/var/task',
    process.cwd(),
    path.join(process.cwd(), '..'),
    '/vercel/path0',
  ];

  for (const vercelPath of vercelPaths) {
    try {
      const packageJsonPath = path.join(vercelPath, 'package.json');
      await fs.access(packageJsonPath, fs.constants.F_OK);
      return vercelPath;
    } catch {
      // пробуем следующий путь
    }
  }

  while (currentDir !== path.parse(currentDir).root) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    try {
      await fs.access(packageJsonPath, fs.constants.F_OK);
      return currentDir;
    } catch {
      // идём на уровень выше
    }
    currentDir = path.dirname(currentDir);
  }

  console.error(`[ServerUtils] ❌ Корень проекта не найден, начиная с: ${startDir}`);
  console.error(`[ServerUtils] Попробованные пути:`, vercelPaths.concat([startDir]));
  return null;
}

/**
 * Находит абсолютный путь к корневой директории пакета Fontsource.
 * @param packageName — имя пакета БЕЗ префикса @fontsource/ (например, 'roboto').
 */
export async function findFontsourcePackagePath(
  packageName: string,
  options: { silent?: boolean } = {},
): Promise<string | null> {
  const { silent = false } = options;
  const projectRoot = await findProjectRoot(__dirname);
  if (!projectRoot) {
    if (!silent) {
      console.error('[ServerUtils] Не удалось найти корневую директорию проекта (package.json).');
    }
    return null;
  }

  const isVariableRequest = packageName.startsWith('variable/');
  const baseName = isVariableRequest ? packageName.substring(9) : packageName;

  const normalPackageName = `@fontsource/${baseName}`;
  const variablePackageName = `@fontsource-variable/${baseName}`;

  let packageDir: string;
  let metadataPath: string;

  if (isVariableRequest) {
    packageDir = path.join(projectRoot, 'node_modules', variablePackageName);
    metadataPath = path.join(packageDir, 'metadata.json');

    try {
      await fs.access(metadataPath, fs.constants.F_OK);
      return packageDir;
    } catch (error) {
      if (!silent) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[ServerUtils] ⚠️ Вариативный пакет ${variablePackageName} не найден: ${message}`);
      }
    }
  }

  packageDir = path.join(projectRoot, 'node_modules', normalPackageName);
  metadataPath = path.join(packageDir, 'metadata.json');

  try {
    await fs.access(metadataPath, fs.constants.F_OK);
    return packageDir;
  } catch (error) {
    if (!silent) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[ServerUtils] ⚠️ Обычный пакет ${normalPackageName} не найден: ${message}`);
    }

    if (!isVariableRequest) {
      packageDir = path.join(projectRoot, 'node_modules', variablePackageName);
      metadataPath = path.join(packageDir, 'metadata.json');

      try {
        await fs.access(metadataPath, fs.constants.F_OK);
        return packageDir;
      } catch (variableError) {
        if (!silent) {
          const varMessage = variableError instanceof Error ? variableError.message : String(variableError);
          console.error(`[ServerUtils] ❌ Не найдены пакеты ${normalPackageName} и ${variablePackageName}`);
          console.error(`[ServerUtils] Попытки поиска:`);
          console.error(
            `[ServerUtils] - ${path.join(projectRoot, 'node_modules', normalPackageName, 'metadata.json')}`,
          );
          console.error(
            `[ServerUtils] - ${path.join(projectRoot, 'node_modules', variablePackageName, 'metadata.json')}`,
          );
        }
      }
    }
    return null;
  }
}
