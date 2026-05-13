import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDismissibleLayer } from "../ui/useDismissibleLayer";
import { SegmentedControl } from "../ui/SegmentedControl";
import { AuthAccountPopover } from "../auth/AuthAccountPopover";

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
      <path
        d="M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z"
        fill="currentColor"
      />
    </svg>
  );
}

function IconStar({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function IconHeart({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  );
}

function IconCode({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function IconUsers({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87" />
      <path d="M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}

function IconTelegram({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

function IconGithub({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

function IconMail({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function IconPalette({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="13.5" cy="6.5" r=".5" />
      <circle cx="17.5" cy="10.5" r=".5" />
      <circle cx="8.5" cy="7.5" r=".5" />
      <circle cx="6.5" cy="12.5" r=".5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.638-1.688h1.96c3.072 0 5.566-2.494 5.566-5.562C21.5 6.5 17 2 12 2z" />
    </svg>
  );
}

function IconZap({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconGlobe({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

function IconSun({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  );
}

function IconMonitor({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function IconExternalLink({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

const SETTINGS_TABS = [
  { id: "about", label: "О проекте", icon: IconStar },
  { id: "contacts", label: "Контакты", icon: IconUsers },
  { id: "settings", label: "Настройки", icon: IconSettings },
];

const THEME_MODE_OPTIONS = [
  {
    value: "light",
    label: "Светлая",
    title: "Светлая тема интерфейса",
    icon: IconSun,
  },
  {
    value: "dark",
    label: "Тёмная",
    title: "Тёмная тема интерфейса",
    icon: IconMoon,
  },
  {
    value: "auto",
    label: "Авто",
    title: "Автоматически по системной теме",
    icon: IconMonitor,
  },
];

function ThemeModeCard({ themeMode, darkTheme, setThemeMode }) {
  const currentLabel = darkTheme ? "тёмная" : "светлая";
  const modeLabel =
    themeMode === "auto" ? "Авто" : themeMode === "dark" ? "Тёмная" : "Светлая";

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-gray-500">
          Тема интерфейса
        </p>
      </div>
      <div className="p-4">
        <SegmentedControl
          value={themeMode}
          onChange={setThemeMode}
          options={THEME_MODE_OPTIONS.map((opt) => ({
            ...opt,
            label: (
              <span className="flex items-center gap-1.5">
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
              </span>
            ),
          }))}
          variant="card"
        />
        <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
          <span className="text-xs text-gray-600">Текущий режим:</span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-medium text-gray-900">
              {currentLabel}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-accent/20 bg-gradient-to-br from-white via-white to-accent-soft/30 shadow-sm">
      <div className="border-b border-accent/10 bg-gradient-to-r from-accent/5 to-transparent px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white shadow-sm">
            <IconZap className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-accent">
              DINAMIC FONT
            </p>
            <p className="mt-0.5 text-base font-semibold text-gray-950">
              Тестирование, сравнение и работа со шрифтами
            </p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm leading-relaxed text-gray-600">
          Инструмент для быстрой загрузки шрифтов, сравнения начертаний,
          проверки переменных осей и сборки собственных подборок — без лишней
          рутины.
        </p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, accent = false }) {
  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border p-4 transition-all hover:shadow-md ${
        accent
          ? "border-accent/30 bg-gradient-to-br from-accent-soft/20 to-white"
          : "border-gray-200 bg-white hover:border-accent/20"
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors ${
          accent
            ? "bg-accent/10 text-accent"
            : "bg-gray-100 text-gray-600 group-hover:bg-accent/10 group-hover:text-accent"
        }`}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
        <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
      </div>
    </div>
  );
}

function ContactCard({
  icon: Icon,
  label,
  title,
  description,
  url,
  placeholder = false,
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (url) {
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white transition-all hover:border-accent/30 hover:shadow-md">
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600 transition-colors group-hover:from-accent/10 group-hover:to-accent/5 group-hover:text-accent">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400">
            {label}
          </p>
          <h4 className="mt-0.5 text-sm font-semibold text-gray-900">
            {title}
          </h4>
          <p className="mt-1 text-xs leading-5 text-gray-500">{description}</p>
        </div>
      </div>
      {url && (
        <div className="flex border-t border-gray-100">
          <button
            type="button"
            onClick={() => window.open(url, "_blank")}
            className="flex flex-1 items-center justify-center gap-1.5 border-r border-gray-100 px-4 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-accent/5 hover:text-accent"
          >
            <IconExternalLink className="h-3.5 w-3.5" />
            Открыть
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex flex-1 items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-gray-700 transition-colors hover:bg-accent/5 hover:text-accent"
          >
            {copied ? (
              <>
                <svg
                  className="h-3.5 w-3.5 text-green-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Скопировано
              </>
            ) : (
              <>
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Копировать
              </>
            )}
          </button>
        </div>
      )}
      {placeholder && (
        <div className="border-t border-dashed border-gray-200 px-4 py-2.5">
          <span className="text-xs text-gray-400">Ссылка не указана</span>
        </div>
      )}
    </div>
  );
}

function FutureFeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-accent/5" />
      <div className="relative flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100/80 text-gray-400">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-medium text-gray-500">{title}</h4>
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
              Скоро
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-gray-400">{description}</p>
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState("about");

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
    if (activeTab === "about") {
      return (
        <div className="space-y-5">
          <HeroCard />

          <div className="grid gap-3">
            <FeatureCard
              icon={IconGlobe}
              title="Три каталога шрифтов"
              description="Локальные файлы, Google Fonts и Fontsource — всё в одном интерфейсе с быстрым поиском и фильтрами."
              accent
            />
            <FeatureCard
              icon={IconPalette}
              title="Гибкие режимы предпросмотра"
              description="Текстовый режим, галерея глифов, таблица стилей и каскад размеров — для полной проверки шрифта."
            />
            <FeatureCard
              icon={IconCode}
              title="Поддержка Variable Fonts"
              description="Интерактивные слайдеры для всех осей переменного шрифта с мгновенным отображением результата."
            />
          </div>

          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
              <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
              Планы на будущее
              <span className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent" />
            </h3>
            <FeatureCard
              icon={IconHeart}
              title="Поддержать проект"
              description="Кнопка доната для пользователей, которым инструмент экономит время."
              accent
            />
            <FutureFeatureCard
              icon={IconCode}
              title="Open Source версия"
              description="Публичный roadmap, issues и точки входа для контрибьюторов."
            />
          </div>
        </div>
      );
    }

    if (activeTab === "contacts") {
      return (
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
              <IconUsers className="h-4 w-4 text-gray-500" />
              Каналы связи
            </h3>
            <p className="mt-1.5 text-xs leading-5 text-gray-500">
              Выберите удобный способ связи — для баг-репортов, вопросов или
              предложений по улучшению.
            </p>
          </div>

          <div className="grid gap-4">
            <ContactCard
              icon={IconTelegram}
              label="Telegram"
              title="Канал обновлений"
              description="Новости продукта, опросы по фичам и быстрый фидбек."
              placeholder
            />
            <ContactCard
              icon={IconGithub}
              label="GitHub"
              title="Issues и Roadmap"
              description="Баг-репорты, предложения по UX и прозрачный список задач."
              placeholder
            />
            <ContactCard
              icon={IconMail}
              label="Email"
              title="Прямой контакт"
              description="Деловые запросы, коллаборации и вопросы вне соцсетей."
              placeholder
            />
          </div>

          <div className="rounded-xl border border-dashed border-gray-300 bg-gradient-to-br from-gray-50/50 to-white p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <svg
                className="h-4 w-4 text-gray-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <span>
                Контактные данные будут добавлены после запуска проекта
              </span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <ThemeModeCard
          themeMode={themeMode}
          darkTheme={darkTheme}
          setThemeMode={setThemeMode}
        />

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-gray-400">
            <span className="h-px flex-1 bg-gradient-to-r from-gray-200 to-transparent" />
            Дополнительные настройки
            <span className="h-px flex-1 bg-gradient-to-l from-gray-200 to-transparent" />
          </h3>

          <div className="grid gap-3">
            <FutureFeatureCard
              icon={IconPalette}
              title="Плотность интерфейса"
              description="Компактный, стандартный или расширенный режим отображения элементов."
            />
            <FutureFeatureCard
              icon={IconZap}
              title="Анимации и переходы"
              description="Настройка плавности анимаций или полное отключение для производительности."
            />
            <FutureFeatureCard
              icon={IconGlobe}
              title="Размер карточек каталога"
              description="Настройка отображения шрифтов в сетке: компактно, средне или подробно."
            />
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-gray-300 bg-gradient-to-br from-gray-50/50 to-white p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-900">
                Сброс настроек
              </h4>
              <p className="mt-1 text-xs leading-5 text-gray-500">
                Все пользовательские предпочтения будут сброшены до значений по
                умолчанию.
              </p>
              <button
                type="button"
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <svg
                  className="h-3.5 w-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 102.13-9.36L1 10" />
                </svg>
                Сбросить все настройки
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const settingsDialog =
    isAppSettingsOpen && !isSidebarCollapsed && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[400] flex items-center justify-center bg-black/20 backdrop-blur-[2px]"
            role="dialog"
            aria-modal="true"
            aria-label="Настройки приложения"
            onClick={() => setIsAppSettingsOpen(false)}
          >
            <div
              ref={settingsDialogRef}
              className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl ring-1 ring-black/5"
              onClick={(event) => event.stopPropagation()}
            >
              {/* Шапка в стиле PopupDialogHeader: нижняя граница, заголовок uppercase, закрытие с border-l */}
              <div className="shrink-0 flex min-h-[3rem] items-stretch border-b border-gray-200 bg-white">
                <div className="flex min-h-12 min-w-0 flex-1 items-center px-6 py-3">
                  <h2 className="text-lg font-semibold uppercase leading-snug tracking-tight text-gray-900">
                    Настройки и информация
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAppSettingsOpen(false)}
                  className="inline-flex w-12 shrink-0 items-center justify-center border-l border-gray-200 text-gray-800 transition-colors hover:bg-transparent hover:text-accent"
                  aria-label="Закрыть окно настроек"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="shrink-0 border-b border-gray-100 bg-gray-50/40 px-6 py-4">
                <div className="flex gap-1.5 rounded-xl bg-gray-100/80 p-1.5">
                  {SETTINGS_TABS.map((tab) => {
                    const isActive = tab.id === activeTab;
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                          isActive
                            ? "bg-white shadow-sm text-gray-900"
                            : "text-gray-500 hover:text-gray-900 hover:bg-white/50"
                        }`}
                        aria-pressed={isActive}
                      >
                        <Icon
                          className={`h-4 w-4 ${isActive ? "text-accent" : ""}`}
                        />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto bg-gray-50/30 px-6 py-5">
                {renderActiveTab()}
              </div>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {settingsDialog}
      <div className="relative min-h-[52px] border-t border-gray-200 bg-white p-2">
        <div
          className={
            isSidebarCollapsed
              ? "flex h-full flex-col items-center justify-center gap-2 py-1"
              : "grid h-full grid-cols-3 gap-2"
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
            className={`group inline-flex items-center justify-center rounded-md bg-gray-50 text-gray-600 transition-all hover:bg-gray-100 hover:text-accent ${
              isSidebarCollapsed ? "h-9 w-9 shrink-0" : ""
            }`}
            aria-label={
              isSidebarCollapsed
                ? "Развернуть левую панель"
                : "Свернуть левую панель"
            }
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              className="h-4 w-4 transition-transform group-hover:scale-110"
              aria-hidden
            >
              {isSidebarCollapsed ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 6l6 6-6 6"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 18l-6-6 6-6"
                />
              )}
            </svg>
          </button>
          {!isSidebarCollapsed ? (
            <button
              type="button"
              onClick={() => setIsAppSettingsOpen((prev) => !prev)}
              className={`group inline-flex items-center justify-center rounded-md transition-all ${
                isAppSettingsOpen
                  ? "bg-accent text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-accent/10 hover:text-accent"
              }`}
              aria-label="Настройки приложения"
              aria-pressed={isAppSettingsOpen}
            >
              <IconSettings className="h-4 w-4 transition-transform group-hover:rotate-90" />
            </button>
          ) : null}
          {!isSidebarCollapsed ? <AuthAccountPopover isSidebarCollapsed={isSidebarCollapsed} /> : null}
          {isSidebarCollapsed ? (
            <>
              <button
                type="button"
                onClick={() => setIsAppSettingsOpen((prev) => !prev)}
                className={`group inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-all ${
                  isAppSettingsOpen
                    ? "bg-accent text-white shadow-sm"
                    : "bg-gray-50 text-gray-600 hover:bg-accent/10 hover:text-accent"
                }`}
                aria-label="Настройки приложения"
                aria-pressed={isAppSettingsOpen}
              >
                <IconSettings className="h-4 w-4 transition-transform group-hover:rotate-90" />
              </button>
              <AuthAccountPopover isSidebarCollapsed={isSidebarCollapsed} />
            </>
          ) : null}
        </div>
      </div>
    </>
  );
}
