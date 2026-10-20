import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown for assistant replies: paragraphs, headings, bullet/numbered lists,
 * **bold**, *italic* and `code`. Builds React elements directly — no HTML is ever injected.
 */
export function Markdown({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push(
        <p key={i} className="mt-3 font-semibold text-ink first:mt-0">
          {inline(heading[2])}
        </p>,
      );
      i++;
      continue;
    }

    const isBullet = (l: string) => /^\s*[-*•]\s+/.test(l);
    const isNumbered = (l: string) => /^\s*\d+[.)]\s+/.test(l);
    if (isBullet(line) || isNumbered(line)) {
      const ordered = isNumbered(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? isNumbered(lines[i]) : isBullet(lines[i]))) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/, ""));
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={i} className={`my-2 space-y-1.5 pl-5 ${ordered ? "list-decimal" : "list-disc"} marker:text-leaf`}>
          {items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s+/.test(lines[i]) && !isBullet(lines[i]) && !isNumbered(lines[i])) {
      paragraph.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={i} className="my-2 first:mt-0 last:mb-0">
        {paragraph.map((l, j) => (
          <Fragment key={j}>
            {j > 0 && <br />}
            {inline(l)}
          </Fragment>
        ))}
      </p>,
    );
  }

  return <div className="leading-relaxed">{blocks}</div>;
}

function inline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(text.slice(last, index));
    const token = match[0];
    if (token.startsWith("**")) nodes.push(<strong key={index} className="font-semibold text-ink">{token.slice(2, -2)}</strong>);
    else if (token.startsWith("`")) nodes.push(<code key={index} className="rounded bg-moss px-1 py-0.5 text-[0.9em]">{token.slice(1, -1)}</code>);
    else nodes.push(<em key={index}>{token.slice(1, -1)}</em>);
    last = index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
