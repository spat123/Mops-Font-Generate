import { NextApiRequest, NextApiResponse } from 'next';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

/**
 * API для генерации статических шрифтов из вариативных
 * Использует Python fonttools для настоящей статической генерации
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fontData, variableSettings, format = 'woff2' } = req.body;

  if (!fontData || !variableSettings) {
    return res.status(400).json({ error: 'Missing fontData or variableSettings' });
  }

  const tempDir = path.join(process.cwd(), 'temp');
  const inputPath = path.join(tempDir, `input-${Date.now()}.ttf`);
  const outputPath = path.join(tempDir, `output-${Date.now()}.${format}`);

  try {
    // Создаем temp директорию если не существует
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Сохраняем входной файл
    const buffer = Buffer.from(fontData, 'base64');
    await writeFile(inputPath, buffer);

    // Формируем команду для fonttools
    const axisArgs = Object.entries(variableSettings)
      .map(([axis, value]) => `${axis}=${value}`);

    // Используем путь к fonttools в виртуальном окружении
    const fontToolsPath = path.join(process.cwd(), 'fonttools-env', 'bin', 'python');
    const command = fontToolsPath;
    const args = [
      '-m', 'fontTools.varLib.instancer',
      inputPath,
      ...axisArgs,  // Разворачиваем массив аргументов
      '--output',
      outputPath
    ];

    // Выполняем команду
    const result = await new Promise((resolve, reject) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`fonttools failed with code ${code}: ${stderr}`));
        }
      });
    });

    // Читаем результат
    const staticFontData = fs.readFileSync(outputPath);
    
    // Очищаем временные файлы
    await unlink(inputPath);
    await unlink(outputPath);

    // Возвращаем результат
    res.status(200).json({
      success: true,
      data: staticFontData.toString('base64'),
      size: staticFontData.length,
      format
    });

  } catch (error) {
    // Очищаем временные файлы в случае ошибки
    try {
      if (fs.existsSync(inputPath)) await unlink(inputPath);
      if (fs.existsSync(outputPath)) await unlink(outputPath);
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }

    console.error('Static font generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate static font',
      details: error.message 
    });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
} 