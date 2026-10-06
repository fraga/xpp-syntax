import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import textmate from 'vscode-textmate';
import oniguruma from 'vscode-oniguruma';
import xmlGrammars from '@shikijs/langs/xml';

const require = createRequire(import.meta.url);
const wasm = await readFile(require.resolve('vscode-oniguruma/release/onig.wasm'));
await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));
const raw = textmate.parseRawGrammar(
  await readFile(new URL('../syntaxes/xpp.tmLanguage.json', import.meta.url), 'utf8'),
  'xpp.tmLanguage.json',
);
const external = new Map(xmlGrammars.map(grammar => [grammar.scopeName, grammar]));
if (process.env.XPP_XML_GRAMMAR) {
  const path = process.env.XPP_XML_GRAMMAR;
  external.set('text.xml', textmate.parseRawGrammar(await readFile(path, 'utf8'), path));
}
const registry = new textmate.Registry({
  onigLib: Promise.resolve({
    createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
    createOnigString: text => new oniguruma.OnigString(text),
  }),
  loadGrammar: async scope => scope === raw.scopeName ? raw : external.get(scope) ?? null,
});
const grammar = await registry.loadGrammar('source.xpp');

export function tokenize(source) {
  let state = textmate.INITIAL;
  const lines = source.split(/\r?\n/).map(text => {
    const result = grammar.tokenizeLine(text, state);
    state = result.ruleStack;
    return {
      text,
      tokens: result.tokens.map(token => ({
        ...token,
        text: text.slice(token.startIndex, token.endIndex),
      })),
    };
  });
  return { lines, closed: state.depth === 1 };
}

export function scopesAt(result, line, needle) {
  const row = result.lines[line];
  const index = row.text.indexOf(needle);
  if (index < 0) throw new Error('Missing token ' + JSON.stringify(needle) + ' on line ' + line);
  return row.tokens.find(token => token.startIndex <= index && token.endIndex > index)?.scopes ?? [];
}
