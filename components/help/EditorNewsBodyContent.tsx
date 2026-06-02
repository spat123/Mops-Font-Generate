type EditorNewsBodyBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] };

const BULLET_PREFIX = /^[•\-–—]\s+/;

function normalizeListItem(text: string): string {
  return text.replace(/[;.]+\s*$/, '').trim();
}

function isSectionHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.endsWith(':')) return false;
  if (trimmed.length > 48) return false;
  return !BULLET_PREFIX.test(trimmed);
}

/** Разбирает plain-text body новости/обновления в абзацы, подзаголовки и списки. */
export function parseEditorNewsBody(body: string): EditorNewsBodyBlock[] {
  if (!body || typeof body !== 'string') return [];

  const blocks: EditorNewsBodyBlock[] = [];
  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push({ type: 'list', items: [...listItems] });
    listItems = [];
  };

  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      flushParagraph();
      continue;
    }

    if (BULLET_PREFIX.test(line)) {
      flushParagraph();
      listItems.push(normalizeListItem(line.replace(BULLET_PREFIX, '')));
      continue;
    }

    flushList();

    if (isSectionHeading(line)) {
      flushParagraph();
      blocks.push({ type: 'heading', text: line.replace(/:\s*$/, '') });
      continue;
    }

    paragraphLines.push(line);
  }

  flushList();
  flushParagraph();
  return blocks;
}

export function EditorNewsBodyContent({
  body,
  featured = false,
}: {
  body?: string;
  featured?: boolean;
}) {
  const blocks = parseEditorNewsBody(body || '');
  if (blocks.length === 0) return null;

  const textClass = featured ? 'text-sm leading-7 text-gray-700 sm:text-[15px]' : 'text-sm leading-7 text-gray-700';

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          return (
            <p
              key={`heading-${index}`}
              className="pt-1 text-xs font-semibold uppercase tracking-wide text-gray-900"
            >
              {block.text}
            </p>
          );
        }

        if (block.type === 'list') {
          return (
            <ul
              key={`list-${index}`}
              className={`${textClass} list-disc space-y-2 pl-5 marker:text-gray-400`}
            >
              {block.items.map((item) => (
                <li key={item.slice(0, 64)}>{item}</li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`} className={textClass}>
            {block.text}
          </p>
        );
      })}
    </div>
  );
}
