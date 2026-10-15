// Discord's message markdown as HTML, for previews. Everything typed is escaped first, so the result is safe for
// {@html}. Supported: **bold**, *italic* / _italic_, __underline__, ~~strike~~, ||spoiler||, `code`, ```blocks```,
// # headings, -# small text, > quotes, - lists, bare links and (where Discord allows them) [masked](links).

interface Options {
  /** [text](https://link) works in an embed's text, not in a plain message. */
  maskedLinks?: boolean;
  /** The first line continues the line before it (the mentions) instead of starting a new one. */
  inlineFirst?: boolean;
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = (text: string) => text.replace(/[&<>"]/g, char => ESCAPES[char]);

const CODE = 'rounded bg-[#1E1F22] px-1 font-mono text-[0.85em]';
const PRE = 'my-1 overflow-x-auto whitespace-pre rounded-md bg-[#1E1F22] px-2 py-1.5 font-mono text-xs';
const LINK = 'text-[#00A8FC] hover:underline';

export const renderMarkdown = (source: string, options: Options = {}): string => {
  const stash: string[] = [];
  const keep = (html: string) => `\u0000${stash.push(html) - 1}\u0000`;
  const restore = (text: string) => text.replace(/\u0000(\d+)\u0000/g, (_, index) => stash[Number(index)]);

  let text = source.replace(/```(?:[a-z0-9+-]*\n)?([\s\S]*?)```/gi, (_, code: string) => keep(`<pre class="${PRE}">${escapeHtml(code.replace(/\n$/, ''))}</pre>`));
  text = text.replace(/`([^`\n]+)`/g, (_, code: string) => keep(`<code class="${CODE}">${escapeHtml(code)}</code>`));
  text = escapeHtml(text);

  const link = (href: string, label: string) => keep(`<a href="${href}" target="_blank" rel="noopener noreferrer" class="${LINK}">${label}</a>`);
  if (options.maskedLinks) text = text.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, (_, label: string, href: string) => link(href, label));
  text = text.replace(/https?:\/\/[^\s<>\u0000]+/g, href => link(href, href));

  const inline = (line: string) =>
    line
      .replace(/\|\|(.+?)\|\|/g, '<span class="rounded bg-[#1E1F22] px-0.5 text-[#1E1F22] hover:bg-transparent hover:text-inherit">$1</span>')
      .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<u>$1</u>')
      .replace(/\*(?!\s)(.+?)\*/g, '<em>$1</em>')
      .replace(/(^|[^\w])_(?!\s)(.+?)_(?!\w)/g, '$1<em>$2</em>')
      .replace(/~~(.+?)~~/g, '<s>$1</s>');

  const lines = text.split('\n').map((line, index) => {
    const first = index === 0 && options.inlineFirst;
    const heading = /^(#{1,3}) (.+)$/.exec(line);
    if (heading) return `<div class="${['text-base font-bold', 'text-sm font-bold', 'text-xs font-bold'][heading[1].length - 1]} mt-1">${inline(heading[2])}</div>`;
    const small = /^-# (.+)$/.exec(line);
    if (small) return `<div class="text-[11px] text-[#949BA4]">${inline(small[1])}</div>`;
    const quote = /^&gt; ?(.*)$/.exec(line);
    if (quote) return `<div class="border-l-4 border-[#4E5058] pl-2">${inline(quote[1])}</div>`;
    const item = /^[-*] (.+)$/.exec(line);
    if (item) return `<div class="flex gap-2 pl-2"><span aria-hidden="true">&bull;</span><span class="min-w-0">${inline(item[1])}</span></div>`;
    if (first) return `<span class="ml-1">${inline(line)}</span>`;
    return line.trim() ? `<div>${inline(line)}</div>` : '<div class="h-4"></div>';
  });
  let html = lines.join('');
  while (html.includes('\u0000')) html = restore(html);
  return html;
};
