import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDismissibleLayer } from '../ui/useDismissibleLayer';
import { SegmentedControl } from '../ui/SegmentedControl';

function IconSettings(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      {...props}
    >
      <path
        d="M0.851506 14.3757C0.385266 13.5092 0.152146 13.076 0.0607209 12.6172C-0.0201961 12.2111 -0.0202407 11.7923 0.0605898 11.3862C0.151918 10.9273 0.384945 10.4941 0.851 9.6275L4.13842 3.51504C4.63072 2.59969 4.87687 2.14201 5.22701 1.80874C5.53677 1.51391 5.90393 1.29078 6.30392 1.15429C6.75606 1 7.26302 1 8.27695 1L15.7227 1C16.7366 1 17.2435 1 17.6957 1.15428C18.0956 1.29076 18.4628 1.51387 18.7725 1.80869C19.1227 2.14194 19.3688 2.59959 19.8611 3.51488L23.1489 9.62744C23.615 10.494 23.8481 10.9273 23.9394 11.3862C24.0202 11.7923 24.0202 12.2111 23.9393 12.6172C23.8479 13.076 23.6147 13.5093 23.1485 14.3758L19.8611 20.4849C19.3688 21.3998 19.1227 21.8573 18.7726 22.1904C18.4629 22.4851 18.0959 22.7081 17.696 22.8446C17.244 22.9988 16.7372 22.9989 15.7237 22.999L8.27806 23C7.26423 23.0001 6.75732 23.0002 6.3052 22.846C5.90522 22.7096 5.53806 22.4865 5.22827 22.1918C4.87809 21.8586 4.63187 21.401 4.13943 20.4859L0.851506 14.3757Z"
        fill="white"
      />
      <path
        d="M15.7227 1C16.7366 1 17.2435 1 17.6957 1.15428C18.0956 1.29076 18.4628 1.51387 18.7725 1.80869C19.1227 2.14194 19.3688 2.59959 19.8611 3.51488L23.1489 9.62744C23.615 10.494 23.8481 10.9273 23.9394 11.3862C24.0202 11.7923 24.0202 12.2111 23.9393 12.6172L23.8983 12.7891C23.7861 13.1912 23.5564 13.6176 23.1485 14.3758L19.8611 20.4849L19.5322 21.0908C19.2389 21.6208 19.0351 21.9406 18.7726 22.1904L18.6542 22.2979C18.3711 22.5398 18.0458 22.7252 17.696 22.8446L17.5234 22.8955C17.1097 22.9989 16.6108 22.9989 15.7237 22.999L8.27806 23L8.27738 21L15.7236 20.999C16.8763 20.9989 16.9862 20.9738 17.0498 20.9521C17.1728 20.9101 17.2906 20.8392 17.3935 20.7412C17.457 20.6808 17.5416 20.5739 18.0996 19.5371L21.3876 13.4277C21.9124 12.4524 21.9582 12.3228 21.9774 12.2266C22.007 12.0784 22.007 11.9246 21.9774 11.7764C21.9582 11.6802 21.9122 11.5505 21.3876 10.5752L18.0996 4.46191C17.5421 3.42559 17.457 3.31828 17.3935 3.25781C17.2905 3.15982 17.1729 3.08889 17.0498 3.04688C16.9862 3.02519 16.8777 3 15.7226 3H8.27738C7.12444 3 7.01384 3.02522 6.95024 3.04688C6.82712 3.08889 6.70847 3.15981 6.60552 3.25781C6.54205 3.31834 6.4561 3.42694 5.89947 4.46191L2.61239 10.5752C2.08783 11.5506 2.04174 11.6802 2.02255 11.7764C1.99305 11.9246 1.99302 12.0784 2.02255 12.2266C2.04176 12.3228 2.08761 12.4525 2.61239 13.4277L5.90044 19.5381C6.45837 20.5749 6.54298 20.6827 6.60649 20.7432C6.70946 20.8411 6.8281 20.9111 6.95122 20.9531C7.0148 20.9748 7.12467 21.0001 8.27738 21L8.27806 23L7.60551 22.998C7.11284 22.9921 6.77403 22.9702 6.47856 22.8965L6.3052 22.846C5.9551 22.7266 5.63008 22.541 5.34674 22.2988L5.22827 22.1918C4.96566 21.9419 4.76124 21.6222 4.46784 21.0918L4.13943 20.4859L0.851506 14.3757C0.443571 13.6176 0.213916 13.1912 0.101668 12.7891L0.0607209 12.6172C-0.0201961 12.2111 -0.0202407 11.7923 0.0605898 11.3862C0.129133 11.0421 0.277629 10.712 0.544047 10.2031L0.851 9.6275L4.13842 3.51504C4.63072 2.59969 4.87687 2.14201 5.22701 1.80874C5.49795 1.55085 5.81299 1.34814 6.15532 1.20996L6.30392 1.15429C6.64302 1.03857 7.01301 1.00919 7.60453 1.00195L8.27695 1L15.7227 1Z"
        fill="currentColor"
      />
      <path d="M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" fill="currentColor" />
    </svg>
  );
}

const SETTINGS_TABS = [
  { id: 'about', label: 'О проекте' },
  { id: 'contacts', label: 'Контакты' },
  { id: 'settings', label: 'Настройки' },
];

const THEME_MODE_OPTIONS = [
  { value: 'light', label: 'Светлая', title: 'Светлая тема интерфейса' },
  { value: 'dark', label: 'Тёмная', title: 'Тёмная тема интерфейса' },
  { value: 'auto', label: 'Авто', title: 'Автоматически по системной теме' },
];

function ThemeModeSummary({ themeMode, darkTheme }) {
  const currentLabel = darkTheme ? 'тёмная' : 'светлая';
  const modeLabel =
    themeMode === 'auto'
      ? 'Авто'
      : themeMode === 'dark'
        ? 'Тёмная'
        : 'Светлая';

  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Режим интерфейса</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{modeLabel}</p>
        </div>
        <span className="rounded-full bg-gray-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-gray-600">
          Сейчас {currentLabel}
        </span>
      </div>
      <p className="mt-2 text-xs leading-5 text-gray-600">
        `Авто` подхватывает системную тему. Это удобно, если интерфейс должен меняться вместе с macOS/Windows.
      </p>
    </div>
  );
}

function SettingsInfoCard({ eyebrow, title, description, accent = false }) {
  return (
    <div className={`rounded-xl border px-3 py-3 ${accent ? 'border-accent/20 bg-accent-soft' : 'border-gray-200 bg-white'}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">{eyebrow}</p>
      <p className="mt-1 text-sm font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-xs leading-5 text-gray-600">{description}</p>
    </div>
  );
}

export default function SidebarFooterControls({
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  darkTheme,
  themeMode,
  setThemeMode,
}) {
  const settingsDialogRef = useRef(null);
  const [isAppSettingsOpen, setIsAppSettingsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

  useDismissibleLayer({
    open: isAppSettingsOpen,
    refs: [settingsDialogRef],
    onDismiss: () => setIsAppSettingsOpen(false),
  });

  useEffect(() => {
    if (isSidebarCollapsed) {
      setIsAppSettingsOpen(false);
    }
  }, [isSidebarCollapsed]);

  const renderActiveTab = () => {
    if (activeTab === 'about') {
      return (
        <div className="space-y-3">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-white to-gray-50 px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">Mops Font Generate</p>
            <h3 className="mt-2 text-base font-semibold text-gray-950">Тестовая станция для шрифтов, библиотек и вариативных осей</h3>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              Инструмент помогает быстро загрузить шрифт, сравнить начертания, проверить оси variable-font и собрать собственные подборки
              без лишней рутины.
            </p>
          </div>

          <SettingsInfoCard
            eyebrow="Что внутри"
            title="Локальные шрифты, Google Fonts, Fontsource и библиотеки"
            description="Один интерфейс для превью, сортировки, перемещения по библиотекам и проверки шрифта в нескольких режимах."
          />
          <SettingsInfoCard
            eyebrow="Почему это удобно"
            title="Быстрый просмотр вместо прыжков между сервисами"
            description="Можно сразу проверить каскад размеров, таблицу глифов, стили, вариативные оси и экспорт — без переключения между окнами."
          />

          <div className="grid gap-3">
            <SettingsInfoCard
              eyebrow="❤️ Поддержать проект"
              title="Добавить сюда кнопку доната или подписки"
              description="Хороший мягкий сценарий: короткий текст про пользу инструмента и одна акцентная кнопка без лишнего давления."
              accent
            />
            <SettingsInfoCard
              eyebrow="🚀 Опенсорс"
              title="Подсветить идею open source-версии"
              description="Можно обещать публичный roadmap, issues и несколько готовых точек входа для контрибьюторов: UI, каталоги, экспорт."
            />
            <SettingsInfoCard
              eyebrow="🙂 Разработчики"
              title="Блок команды"
              description="Сюда хорошо лягут 2-4 карточки с именем, ролью и одной ссылкой: design, frontend, fonts, product."
            />
          </div>
        </div>
      );
    }

    if (activeTab === 'contacts') {
      return (
        <div className="space-y-3">
          <SettingsInfoCard
            eyebrow="Telegram"
            title="Канал обновлений и быстрый фидбек"
            description="Сюда можно поставить ссылку на новости продукта, мини-опросы по фичам и сбор обратной связи."
          />
          <SettingsInfoCard
            eyebrow="GitHub"
            title="Issues, roadmap и обсуждения"
            description="Хорошее место для баг-репортов, предложений по UX и прозрачного списка того, что делается дальше."
          />
          <SettingsInfoCard
            eyebrow="Email"
            title="Прямой контакт для партнёрств и вопросов"
            description="Подходит для деловых запросов, коллабораций и обратной связи по инструменту вне соцсетей."
          />
          <SettingsInfoCard
            eyebrow="Dribbble / Behance"
            title="Визуальная сторона проекта"
            description="Если захочешь, сюда можно вынести макеты, ранние концепты интерфейса и эволюцию продукта."
          />
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Идея по UX</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">Сделать контакты карточками с копированием</p>
            <p className="mt-1 text-xs leading-5 text-gray-600">
              Вместо простого списка можно добавить кнопку `Открыть`, кнопку `Скопировать` и маленький статус доступности для каждого канала.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Тема интерфейса</p>
          <div className="mt-3">
            <SegmentedControl
              value={themeMode}
              onChange={setThemeMode}
              options={THEME_MODE_OPTIONS}
              variant="surface"
            />
          </div>
          <div className="mt-3">
            <ThemeModeSummary darkTheme={darkTheme} themeMode={themeMode} />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Следующие настройки</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">Что сюда хорошо добавить потом</p>
          <p className="mt-1 text-xs leading-5 text-gray-600">
            Плотность интерфейса, анимации, поведение тултипов, размер карточек каталога и быстрый сброс пользовательских предпочтений.
          </p>
        </div>
      </div>
    );
  };

  const settingsDialog =
    isAppSettingsOpen && !isSidebarCollapsed && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/30 p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки приложения"
            onClick={() => setIsAppSettingsOpen(false)}
          >
            <div
              ref={settingsDialogRef}
              className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="border-b border-gray-200 bg-white px-6 pb-4 pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">Панель приложения</p>
                    <h2 className="mt-1 text-base font-semibold text-gray-950">Настройки и информация</h2>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">
                      Центральный popup для темы интерфейса, короткого описания проекта и контактов.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAppSettingsOpen(false)}
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
                    aria-label="Закрыть окно настроек"
                  >
                    <span aria-hidden>×</span>
                  </button>
                </div>
                <div className="mt-4 flex gap-1 rounded-xl bg-gray-50 p-1">
                  {SETTINGS_TABS.map((tab) => {
                    const isActive = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.04em] transition-colors ${
                          isActive ? 'bg-white text-gray-950 shadow-sm' : 'text-gray-500 hover:text-gray-900'
                        }`}
                        aria-pressed={isActive}
                      >
                        <span className="block truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-gray-50 px-6 py-5">{renderActiveTab()}</div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {settingsDialog}
      <div className="relative border-t min-h-[52px] border-gray-200 bg-white p-2">
        <div
        className={
          isSidebarCollapsed
            ? 'flex h-full items-center justify-start'
            : 'grid h-full grid-cols-2 gap-2'
        }
      >
        <button
          type="button"
          onClick={() =>
            setIsSidebarCollapsed((prev) => {
              const next = !prev;
              if (next) setIsAppSettingsOpen(false);
              return next;
            })
          }
          className={`inline-flex items-center justify-center rounded-md bg-gray-50 text-gray-800 transition-colors hover:text-accent ${
            isSidebarCollapsed ? 'h-full w-full' : ''
          }`}
          aria-label={isSidebarCollapsed ? 'Развернуть левую панель' : 'Свернуть левую панель'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden>
            {isSidebarCollapsed ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
            )}
          </svg>
        </button>
        {!isSidebarCollapsed ? (
          <button
            type="button"
            onClick={() => setIsAppSettingsOpen((prev) => !prev)}
            className={`inline-flex items-center justify-center rounded-md transition-colors ${
              isAppSettingsOpen
                ? 'bg-accent text-white'
                : 'bg-gray-50 text-gray-800 hover:bg-gray-100 hover:text-accent'
            }`}
            aria-label="Настройки приложения"
            aria-pressed={isAppSettingsOpen}
          >
            <IconSettings className="h-4 w-4" />
          </button>
        ) : null}
        </div>
      </div>
    </>
  );
}
