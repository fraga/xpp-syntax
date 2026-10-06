import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { tokenize } from '../test/tokenize.mjs';

const escape = text => text.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

function color(scopes) {
  if (scopes.some(scope => scope.startsWith('comment.'))) return 'comment';
  if (scopes.some(scope => scope.startsWith('constant.other.label.'))) return 'label';
  if (scopes.some(scope => scope.startsWith('constant.character.escape.'))) return 'escape';
  if (scopes.some(scope => scope.startsWith('string.'))) return 'string';
  if (scopes.some(scope => scope.startsWith('keyword.') || scope.startsWith('storage.modifier.'))) return 'keyword';
  if (scopes.some(scope => scope.startsWith('constant.'))) return 'constant';
  if (scopes.some(scope => scope.startsWith('entity.name.function.') || scope.startsWith('support.function.'))) return 'function';
  if (scopes.some(scope => scope.startsWith('storage.type.') || scope.startsWith('entity.name.type.') || scope.startsWith('entity.name.tag.'))) return 'type';
  return 'plain';
}

const css = 'body{margin:2rem;background:#0d1117;color:#e6edf3;font:16px system-ui}h1{font-size:1.4rem}p{color:#8b949e}pre{padding:1.5rem;background:#161b22;border:1px solid #30363d;border-radius:8px;overflow:auto;font:14px/1.65 ui-monospace,monospace}.comment{color:#8b949e}.keyword{color:#ff7b72}.type{color:#79c0ff}.string{color:#a5d6ff}.label{color:#ffa657}.escape{color:#79c0ff}.constant{color:#79c0ff}.function{color:#d2a8ff}';
const output = new URL('../preview/', import.meta.url);
await mkdir(output, { recursive: true });
for (const [file, title] of [['examples/credit-service.xpp', 'X++ Markdown fence preview'], ['test/fixtures/DEVSysTimer.xml', 'D365 class XML preview']]) {
  const source = await readFile(new URL('../' + file, import.meta.url), 'utf8');
  const rendered = tokenize(source).lines.map(line => line.tokens.map(token => '<span class="' + color(token.scopes) + '" title="' + escape(token.scopes.join(' ')) + '">' + escape(token.text) + '</span>').join('')).join('\n');
  const name = file.endsWith('.xpp') ? 'xpp.html' : 'xml.html';
  const html = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>' + title + '</title><style>' + css + '</style><h1>' + title + '</h1><p>Generated locally from source.xpp. Hover a token to inspect its TextMate scopes.</p><pre><code>' + rendered + '</code></pre></html>\n';
  await writeFile(new URL(name, output), html);
  console.log('Wrote preview/' + name);
}
