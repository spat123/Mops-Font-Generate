# Настройка генерации статических шрифтов

Этот проект поддерживает несколько методов генерации статических шрифтов из вариативных:

## 🎯 Методы генерации (в порядке качества)

### 1. 🥇 Серверная генерация (Python fonttools) - ОСНОВНОЙ
- **Качество**: Настоящие статические шрифты ⭐⭐⭐⭐⭐
- **Производительность**: Требует серверных ресурсов
- **Поддержка форматов**: TTF, OTF, WOFF, WOFF2
- **Статус**: ✅ Реализовано в `/api/generate-static-font.js`

### 2. 🥈 Псевдо-статический (Fallback) - ТЕКУЩИЙ
- **Качество**: Ограниченная функциональность ⭐⭐
- **Производительность**: Мгновенно ⭐⭐⭐⭐⭐
- **Поддержка форматов**: CSS + оригинальный файл
- **Статус**: ✅ Работает прямо сейчас

### 3. 🚫 HarfBuzz WASM - УДАЛЕН
- **Причина**: Пакет harfbuzzjs не установлен и сложен в настройке
- **Решение**: Фокус на серверной генерации

## 🛠 Установка

### Шаг 1: Установка зависимостей

```bash
npm install
# или
yarn install
```

### Шаг 2: Настройка серверной генерации (РЕКОМЕНДУЕТСЯ)

Для настоящих статических шрифтов установите Python fonttools:

```bash
# macOS:
# Исправляем права Homebrew (если нужно)
sudo chown -R $(whoami) /usr/local/Homebrew

# Устанавливаем pipx для изолированной установки
brew install pipx

# Устанавливаем fonttools
pipx install fonttools[woff]

# Ubuntu/Debian:
sudo apt-get install python3 python3-pip
pip3 install fonttools[woff]

# Windows:
# Скачайте Python с python.org, затем:
pip install fonttools[woff]
```

### Шаг 3: Проверка установки

```bash
# Проверьте что fonttools установлен
fonttools --version

# Запустите проект
npm run dev
```

## 🧪 Тестирование функциональности

1. Откройте приложение в браузере
2. Загрузите вариативный шрифт
3. Настройте оси
4. Нажмите "Экспорт статического шрифта"
5. Проверьте сообщения в консоли:
   - ✅ "Используется серверная генерация" - лучший результат (настоящие статические шрифты)
   - ⚠️ "Используется псевдо-статический метод" - базовая функциональность (работает везде)

## 🔧 Конфигурация

### Переменные окружения (.env.local)

```env
# Принудительно использовать определенный метод
FORCE_STATIC_GENERATION_METHOD=auto # auto | harfbuzz | server | pseudo

# Максимальный размер файла для обработки (в байтах)
MAX_FONT_FILE_SIZE=10485760

# Временная директория для серверной обработки
TEMP_FONT_DIR=./temp
```

### Настройка форматов вывода

В `utils/staticFontGenerator.js` можно настроить поддерживаемые форматы:

```javascript
const SUPPORTED_FORMATS = ['woff2', 'woff', 'ttf', 'otf'];
```

## 🚨 Решение проблем

### HarfBuzz не загружается

```bash
# Проверьте что модуль установлен
npm list harfbuzzjs

# Переустановите если нужно
npm uninstall harfbuzzjs
npm install harfbuzzjs@latest
```

### Серверная генерация не работает

```bash
# Проверьте Python
python --version
python3 --version

# Проверьте fonttools
pip list | grep fonttools

# Переустановите fonttools
pip uninstall fonttools
pip install fonttools[woff]
```

### Права доступа к временной директории

```bash
# Создайте директорию вручную
mkdir temp
chmod 755 temp

# Или измените путь в .env.local
TEMP_FONT_DIR=/tmp/font-processing
```

## 📊 Сравнение методов

| Метод | Качество | Скорость | Размер файла | Поддержка форматов |
|-------|----------|----------|--------------|-------------------|
| HarfBuzz | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Оптимальный | Все |
| Сервер | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | Оптимальный | Все |
| Псевдо | ⭐⭐ | ⭐⭐⭐⭐⭐ | Без изменений | CSS только |

## 🎯 Рекомендации

1. **Для продакшена**: Настройте серверную генерацию
2. **Для разработки**: HarfBuzz WASM достаточно
3. **Для демо**: Псевдо-статический метод работает везде

## 🔗 Полезные ссылки

- [HarfBuzz WASM](https://github.com/harfbuzz/harfbuzzjs)
- [Python fonttools](https://github.com/fonttools/fonttools)
- [Variable Fonts Guide](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Fonts/Variable_fonts_guide)