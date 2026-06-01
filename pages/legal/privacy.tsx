import React from 'react';
import {
  LegalLi,
  LegalLink,
  LegalPageLayout,
  LegalP,
  LegalSection,
  LegalUl,
} from '../../components/legal/LegalPageLayout';
import { getOperatorLine, legalMeta } from '../../config/legal';

export default function PrivacyPage() {
  const operator = getOperatorLine();

  return (
    <LegalPageLayout
      title="Политика конфиденциальности"
      description="Политика обработки персональных данных сервиса DINAMIC FONT"
      canonicalPath="/legal/privacy"
    >
      <LegalP>
        Настоящая Политика описывает, как обрабатываются персональные данные при использовании{' '}
        <strong className="font-medium text-gray-800">{legalMeta.serviceName}</strong> (
        <a href={legalMeta.siteUrl} className="text-gray-800 underline-offset-2 hover:text-accent">
          {legalMeta.siteUrl}
        </a>
        ). <strong className="font-medium text-gray-800">Оператор (контролёр данных):</strong>{' '}
        {operator}.
      </LegalP>
      <LegalP>
        Используя сервис и создавая аккаунт, вы ознакомляетесь с этой Политикой и{' '}
        <LegalLink href="/legal/terms">Условиями использования</LegalLink>.
      </LegalP>

      <LegalSection title="1. Какие данные мы обрабатываем">
        <LegalP>
          <strong className="font-medium text-gray-800">Данные аккаунта:</strong> email, имя (если
          передано OAuth-провайдером), идентификаторы Google/Яндекс, хэш пароля (пароль в открытом
          виде не храним), аватар (URL), тариф (Free/Pro), даты регистрации и подтверждения email,
          технические идентификаторы сессии.
        </LegalP>
        <LegalP>
          <strong className="font-medium text-gray-800">Данные использования сервиса:</strong>{' '}
          названия и состав библиотек шрифтов, метаданные подборок, настройки, связанные с аккаунтом
          на сервере (база данных Postgres, хостинг Neon). Файлы шрифтов и объёмные данные превью в
          основном хранятся локально в вашем браузере (IndexedDB) и не передаются на сервер, пока вы
          сами не используете функции, требующие серверной обработки (например, генерация статики).
        </LegalP>
        <LegalP>
          <strong className="font-medium text-gray-800">Ссылки «Поделиться»:</strong> в URL может
          содержаться закодированное описание подборки. Любой, у кого есть ссылка, может открыть её —
          не публикуйте ссылку в открытом доступе, если это конфиденциально.
        </LegalP>
        <LegalP>
          <strong className="font-medium text-gray-800">Технические данные:</strong> IP-адрес,
          тип браузера и устройства, cookies сессии, записи в localStorage (лимиты генераций,
          настройки интерфейса), журналы ошибок и обращений к API.
        </LegalP>
        <LegalP>
          <strong className="font-medium text-gray-800">Письма:</strong> адрес получателя и факт
          отправки писем подтверждения email через сервис Resend.
        </LegalP>
      </LegalSection>

      <LegalSection title="2. Цели и правовые основания">
        <LegalUl>
          <LegalLi>регистрация, вход, подтверждение email, восстановление доступа;</LegalLi>
          <LegalLi>предоставление функций сервиса и учёт лимитов тарифов;</LegalLi>
          <LegalLi>безопасность, предотвращение злоупотреблений и мошенничества;</LegalLi>
          <LegalLi>техническая поддержка и ответ на обращения;</LegalLi>
          <LegalLi>обезличенная аналитика посещаемости и производительности (Vercel Analytics, Speed Insights);</LegalLi>
          <LegalLi>исполнение требований законодательства РФ.</LegalLi>
        </LegalUl>
        <LegalP>
          Основания: исполнение договора (оказание услуг сервиса), согласие (где требуется, например
          на отдельные рассылки), законный интерес оператора (безопасность, улучшение продукта в
          обезличенном виде).
        </LegalP>
      </LegalSection>

      <LegalSection title="3. Кому передаются данные">
        <LegalP>
          Данные могут обрабатываться привлечёнными поставщиками (обработчики) strictly для работы
          сервиса:
        </LegalP>
        <LegalUl>
          <LegalLi>
            <strong className="font-medium text-gray-800">Vercel</strong> — хостинг приложения,
            аналитика и метрики производительности;
          </LegalLi>
          <LegalLi>
            <strong className="font-medium text-gray-800">Neon</strong> — база данных пользователей;
          </LegalLi>
          <LegalLi>
            <strong className="font-medium text-gray-800">Resend</strong> — отправка email;
          </LegalLi>
          <LegalLi>
            <strong className="font-medium text-gray-800">Google / Яндекс</strong> — вход через OAuth
            (в объёме, который вы разрешаете провайдеру);
          </LegalLi>
          <LegalLi>
            <strong className="font-medium text-gray-800">Google Fonts / Fontsource</strong> — загрузка
            метаданных и файлов превью по вашему запросу в браузере (политики этих сервисов действуют
            отдельно).
          </LegalLi>
        </LegalUl>
        <LegalP>
          Серверы обработчиков могут находиться за пределами РФ (в том числе в ЕС/США). Мы
          заключаем договоры или используем стандартные условия провайдеров и требуем мер защиты
          данных в объёме, предусмотренном их политиками и применимым правом.
        </LegalP>
      </LegalSection>

      <LegalSection title="4. Cookies и localStorage">
        <LegalP>
          Используются обязательные cookies сессии (вход в аккаунт) и функциональные механизмы
          localStorage для настроек редактора и учёта лимитов. Без них часть функций не работает.
        </LegalP>
        <LegalP>
          Аналитика Vercel направлена на агрегированную статистику; по возможности не используйте
          сервис с блокировщиками, если нужна корректная работа встроенных скриптов (см. документацию
          проекта).
        </LegalP>
      </LegalSection>

      <LegalSection title="5. Срок хранения">
        <LegalP>
          Данные аккаунта хранятся, пока аккаунт активен. После удаления аккаунта — удаляем или
          обезличиваем в разумный срок (как правило, до 30 календарных дней), кроме данных, которые
          обязаны хранить по закону (учёт, претензии).
        </LegalP>
        <LegalP>
          Технические логи могут храниться ограниченное время для безопасности и диагностики.
        </LegalP>
      </LegalSection>

      <LegalSection title="6. Ваши права">
        <LegalP>Вы вправе:</LegalP>
        <LegalUl>
          <LegalLi>запросить информацию об обработке ваших данных;</LegalLi>
          <LegalLi>уточнить или исправить данные;</LegalLi>
          <LegalLi>удалить аккаунт через интерфейс сервиса или по запросу на email;</LegalLi>
          <LegalLi>отозвать согласие, где обработка основана на согласии;</LegalLi>
          <LegalLi>обжаловать действия оператора в Роскомнадзор (для резидентов РФ) или в иной надзорный орган по месту жительства.</LegalLi>
        </LegalUl>
        <LegalP>
          Запросы по персональным данным:{' '}
          <a
            href={`mailto:${legalMeta.privacyEmail}`}
            className="font-medium text-gray-800 underline-offset-2 hover:text-accent"
          >
            {legalMeta.privacyEmail}
          </a>
          . Срок ответа — до 30 календарных дней, если закон не требует иного.
        </LegalP>
      </LegalSection>

      <LegalSection title="7. Безопасность">
        <LegalP>
          Применяем организационные и технические меры: HTTPS, хранение паролей в виде криптографического
          хэша, ограничение доступа к серверам и секретам. Абсолютной защиты в сети Интернет не
          существует; при инциденте уведомим вас, если это потребуется законом.
        </LegalP>
      </LegalSection>

      <LegalSection title="8. Дети">
        <LegalP>
          Сервис не предназначен для лиц младше 14 лет. Если вы узнали, что ребёнок передал нам
          данные без согласия родителей, напишите на {legalMeta.privacyEmail} — удалим данные.
        </LegalP>
      </LegalSection>

      <LegalSection title="9. Изменения политики">
        <LegalP>
          Политика может обновляться. Дата вступления в силу указана в начале документа. Существенные
          изменения доводим до сведения на сайте или по email зарегистрированным пользователям.
        </LegalP>
        <LegalP>
          Контакты оператора: {legalMeta.supportEmail} (общие вопросы), {legalMeta.privacyEmail}{' '}
          (персональные данные).
        </LegalP>
      </LegalSection>
    </LegalPageLayout>
  );
}
