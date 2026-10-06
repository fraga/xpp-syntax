import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { tokenize, scopesAt } from './tokenize.mjs';

function has(result, line, text, scope) {
  const scopes = scopesAt(result, line, text);
  assert.ok(scopes.includes(scope), text + ': expected ' + scope + ', received ' + scopes.join(' '));
}

function lacks(result, line, text, prefix) {
  assert.ok(!scopesAt(result, line, text).some(scope => scope.startsWith(prefix)), text + ': unexpected ' + prefix);
}

test('the original Vim keyword and type inventory is retained regardless of case', async () => {
  const vim = await readFile(new URL('../syntax/xpo.vim', import.meta.url), 'utf8');
  const keywords = [...vim.matchAll(/^syn keyword\s+(?:xppKeywords|xppType)\s+(.+)$/gm)]
    .flatMap(match => match[1].trim().split(/\s+/));
  assert.ok(keywords.length > 0);
  for (const keyword of keywords) {
    for (const spelling of new Set([keyword, keyword.toLowerCase(), keyword.toUpperCase()])) {
      const source = keyword.toLowerCase() === 'new' ? spelling + ' Object()' :
        keyword.toLowerCase() === 'eventhandler' ? spelling + '(handler)' : spelling + ';';
      const scopes = scopesAt(tokenize(source), 0, spelling);
      assert.ok(scopes.some(scope => scope === 'variable.language.xpp' || /^(keyword|storage|constant|support)\./.test(scope)),
        spelling + ': missing language token highlighting');
    }
  }
});

test('classes, inheritance, methods, and primitive types', () => {
  const result = tokenize('public final class CreditService extends ServiceBase\n{\n    public real calculate(int count)\n    {\n        return 1.25;\n    }\n}');
  has(result, 0, 'public', 'storage.modifier.xpp');
  has(result, 0, 'CreditService', 'entity.name.type.class.xpp');
  has(result, 0, 'ServiceBase', 'entity.name.type.xpp');
  has(result, 2, 'real', 'storage.type.primitive.xpp');
  has(result, 2, 'calculate', 'entity.name.function.xpp');
  has(result, 2, 'int', 'storage.type.primitive.xpp');
  assert.ok(result.closed);
});

test('query and transaction keywords ignore case', () => {
  const result = tokenize('ttsBegin;\nwhile SELECT firstOnly forUpdate custTable\n    WHERE custTable.AccountNum == accountNum\n{\n    custTable.update();\n}\nTTSCOMMIT;');
  has(result, 0, 'ttsBegin', 'keyword.control.xpp');
  has(result, 1, 'while', 'keyword.control.xpp');
  for (const keyword of ['SELECT', 'firstOnly', 'forUpdate']) has(result, 1, keyword, 'keyword.other.query.xpp');
  has(result, 2, 'WHERE', 'keyword.other.query.xpp');
  has(result, 6, 'TTSCOMMIT', 'keyword.control.xpp');
});

test('joins, aggregates, ordering, and set-based data operations', () => {
  const result = tokenize('select crossCompany sum(CreditMax) from custTable\n    group by CustGroup order by CustGroup desc\n    notExists join custTrans where custTrans.AccountNum == custTable.AccountNum;\nupdate_recordset custTable setting CreditMax = 5000;\ninsert_recordset tmpTable (AccountNum) select AccountNum from custTable;\ndelete_from tmpTable where tmpTable.RecId != 0;');
  for (const [line, keyword] of [[0, 'crossCompany'], [0, 'sum'], [0, 'from'], [1, 'group'], [1, 'order'], [1, 'desc'], [2, 'notExists'], [2, 'join'], [3, 'update_recordset'], [3, 'setting'], [4, 'insert_recordset'], [5, 'delete_from']]) {
    has(result, line, keyword, 'keyword.other.query.xpp');
  }
});

test('keywords cannot consume prefixes of identifiers', () => {
  const result = tokenize('int firstOnlyCount = 1;\nstr ttsBeginning = "select";\nclassStrValue = whereClause;');
  for (const [line, name] of [[0, 'firstOnlyCount'], [1, 'ttsBeginning'], [2, 'classStrValue'], [2, 'whereClause']]) {
    lacks(result, line, name, 'keyword.');
    lacks(result, line, name, 'support.function.');
  }
});

test('quoted strings protect comment markers and escaped quotes', () => {
  const result = tokenize(String.raw`str a = "select // \"quote\"";
str b = 'ttsBegin /* \'quote\'';
ttsCommit;`);
  has(result, 0, 'select', 'string.quoted.double.xpp');
  has(result, 0, '\\"', 'constant.character.escape.xpp');
  has(result, 1, 'ttsBegin', 'string.quoted.single.xpp');
  lacks(result, 0, '//', 'comment.');
  lacks(result, 1, '/*', 'comment.');
  has(result, 2, 'ttsCommit', 'keyword.control.xpp');
  assert.ok(result.closed);
});

test('verbatim strings span lines and treat backslashes literally', () => {
  const result = tokenize(String.raw`str path = @"C:\temp
select";
ttsBegin;`);
  has(result, 0, 'C:', 'string.quoted.double.verbatim.xpp');
  lacks(result, 0, '\\temp', 'constant.character.escape.');
  has(result, 1, 'select', 'string.quoted.double.verbatim.xpp');
  has(result, 2, 'ttsBegin', 'keyword.control.xpp');
  assert.ok(result.closed);
});

test('unfinished ordinary strings recover at the next line', () => {
  const result = tokenize('str text = "unfinished\nselect firstOnly custTable;');
  has(result, 1, 'select', 'keyword.other.query.xpp');
});

test('labels and placeholders remain inside strings, escaped identifiers remain variables', () => {
  const result = tokenize('info("@SYS12345");\nwarning(strFmt(\'@MyLabels:CreditLimit\', \'%1\'));\nvar @str = 1;');
  has(result, 0, '@SYS12345', 'constant.other.label.xpp');
  has(result, 1, '@MyLabels:CreditLimit', 'constant.other.label.xpp');
  has(result, 1, '%1', 'constant.other.placeholder.xpp');
  has(result, 2, '@str', 'variable.other.xpp');
  lacks(result, 2, '@str', 'storage.type.');
  lacks(result, 2, '@str', 'constant.other.label.');
});

test('macro directives, macro definitions, and references', () => {
  const result = tokenize('#define.CurrentVersion(1)\n#localmacro.CurrentList\n    accountNum,\n    creditMax\n#endmacro\n#if.CurrentVersion\n    version = #CurrentVersion;\n#endif');
  has(result, 0, 'define', 'keyword.control.directive.xpp');
  has(result, 0, 'CurrentVersion', 'entity.name.constant.xpp');
  has(result, 1, 'localmacro', 'keyword.control.directive.xpp');
  has(result, 4, '#endmacro', 'keyword.control.directive.xpp');
  has(result, 5, '#if', 'keyword.control.directive.xpp');
  has(result, 6, '#CurrentVersion', 'constant.other.macro.xpp');
});

test('extension attributes and compile-time functions', () => {
  const result = tokenize('[ExtensionOf(tableStr(CustTable))]\nfinal class CustTable_Extension\n{\n    public void validateWrite()\n    {\n        next validateWrite();\n    }\n}');
  has(result, 0, 'ExtensionOf', 'entity.name.type.attribute.xpp');
  has(result, 0, 'tableStr', 'support.function.compile-time.xpp');
  has(result, 1, 'CustTable_Extension', 'entity.name.type.class.xpp');
  has(result, 5, 'next', 'keyword.control.xpp');
  assert.ok(result.closed);
});

test('container assignment is separate from an attribute', () => {
  const result = tokenize('[accountNum, creditMax] = conPeek(values, 1);\n[item] = values;');
  has(result, 0, 'accountNum', 'meta.container.xpp');
  has(result, 0, 'conPeek', 'support.function.builtin.xpp');
  lacks(result, 0, 'accountNum', 'meta.attribute.');
  lacks(result, 1, 'item', 'meta.attribute.');
  assert.ok(result.closed);
});

test('compile-time functions match case-insensitively only when called', () => {
  const result = tokenize('fieldId = FIELDNUM(CustTable, CreditMax);\nname = methodStr(CreditService, calculate);\ntext = strFmt("%1", int2Str(fieldId));\nclassStr = plainVariable;');
  has(result, 0, 'FIELDNUM', 'support.function.compile-time.xpp');
  has(result, 1, 'methodStr', 'support.function.compile-time.xpp');
  has(result, 2, 'strFmt', 'support.function.builtin.xpp');
  has(result, 2, 'int2Str', 'support.function.builtin.xpp');
  lacks(result, 3, 'classStr', 'support.function.');
});

test('metadata intrinsics retain their role in attributes, arguments, and assignments', () => {
  const result = tokenize('[MyAttribute(attributeStr(SysEntryPointAttribute))]\nstr fieldGroup = tableFieldGroupStr(CustTable, Identification);\nstr source = dataEntityDataSourceStr(CustCustomerV3Entity, CustTable);\nstr delegateName = staticDelegateStr(MyService, Changed);\nint limit = MAXINT();\nstr workflow = workflowTypeStr(MyWorkflow);\nmaxInt = plainVariable;\nobj.workflowTypeStr();');
  for (const [line, name] of [[0, 'attributeStr'], [1, 'tableFieldGroupStr'], [2, 'dataEntityDataSourceStr'], [3, 'staticDelegateStr'], [4, 'MAXINT'], [5, 'workflowTypeStr']]) {
    has(result, line, name, 'support.function.compile-time.xpp');
  }
  lacks(result, 6, 'maxInt', 'support.function.');
  has(result, 7, 'workflowTypeStr', 'entity.name.function.xpp');
  lacks(result, 7, 'workflowTypeStr', 'support.function.');
  assert.ok(result.closed);
});

test('enum members and static method calls use distinct scopes', () => {
  const result = tokenize('catch (Exception::UpdateConflict)\n{\n    retry;\n}\nenabled = NoYes::Yes;\nCreditService::construct();');
  has(result, 0, 'UpdateConflict', 'constant.other.enum.xpp');
  has(result, 2, 'retry', 'keyword.control.xpp');
  has(result, 4, 'Yes;', 'constant.other.enum.xpp');
  has(result, 5, 'CreditService', 'entity.name.type.xpp');
  has(result, 5, 'construct', 'entity.name.function.xpp');
  lacks(result, 5, 'construct', 'constant.other.enum.');
});

test('integer, hex, real, exponent, and date literals', () => {
  const result = tokenize(String.raw`int hex = 0xFF;
real amount = 1.25e-3 + .5 + 2E4;
date cutoff = 21\11\2026;`);
  has(result, 0, '0xFF', 'constant.numeric.hex.xpp');
  for (const number of ['1.25e-3', '.5', '2E4']) has(result, 1, number, 'constant.numeric.xpp');
  has(result, 2, '21\\11\\2026', 'constant.numeric.date.xpp');
});

test('line, documentation, and block comments preserve state', () => {
  const result = tokenize('/// <summary>select ttsBegin</summary>\n/* select\n   ttsBegin; */\n// tableStr(CustTable)\nttsBegin;');
  has(result, 0, 'select', 'comment.line.documentation.xpp');
  has(result, 0, 'summary', 'entity.name.tag.documentation.xpp');
  has(result, 1, 'select', 'comment.block.xpp');
  has(result, 2, 'ttsBegin', 'comment.block.xpp');
  has(result, 3, 'tableStr', 'comment.line.double-slash.xpp');
  has(result, 4, 'ttsBegin', 'keyword.control.xpp');
  assert.ok(result.closed);
});

test('AxClass XML highlights only the Declaration and Source CDATA as X++', () => {
  const result = tokenize('<?xml version="1.0"?>\n<AxClass>\n<Name>ttsBegin</Name>\n<Declaration><![CDATA[class CreditService {}]]></Declaration>\n<Source><![CDATA[select firstOnly custTable;]]></Source>\n<Other><![CDATA[ttsBegin;]]></Other>\n</AxClass>');
  has(result, 1, 'AxClass', 'entity.name.tag.localname.xml');
  lacks(result, 2, 'ttsBegin', 'keyword.');
  has(result, 3, 'CreditService', 'entity.name.type.class.xpp');
  has(result, 4, 'firstOnly', 'keyword.other.query.xpp');
  has(result, 5, 'ttsBegin', 'string.unquoted.cdata.xml');
  lacks(result, 5, 'ttsBegin', 'keyword.');
  has(result, 6, 'AxClass', 'entity.name.tag.localname.xml');
});

test('real-world D365 class metadata closes each embedded source region', async () => {
  for (const name of ['DEVSysTimer.xml', 'DEVFileReaderCSV.xml']) {
    const source = await readFile(new URL('../test/fixtures/' + name, import.meta.url), 'utf8');
    const result = tokenize(source);
    const tokens = result.lines.flatMap(line => line.tokens);
    assert.ok(tokens.some(token => token.scopes.includes('entity.name.type.class.xpp')));
    assert.ok(tokens.some(token => token.scopes.includes('storage.type.primitive.xpp')));
    const closing = result.lines.findIndex(line => line.text.includes('</AxClass>'));
    has(result, closing, 'AxClass', 'entity.name.tag.localname.xml');
    lacks(result, closing, 'AxClass', 'meta.embedded.');
  }
});

test('XML detection accommodates a BOM and leading blank lines', () => {
  const result = tokenize('\uFEFF\n\n  <AxClass>\n<Declaration><![CDATA[class Example {}]]></Declaration>\n</AxClass>');
  has(result, 3, 'Example', 'entity.name.type.class.xpp');
  has(result, 4, 'AxClass', 'entity.name.tag.localname.xml');
});

test('XML header comments stay XML while class CDATA uses X++', () => {
  const result = tokenize('\uFEFF  <!-- class select -->\n<!-- Copyright - preserved\n public ttsBegin -->\n<AxClass>\n<Declaration><![CDATA[class Example {}]]></Declaration>\n<Source><![CDATA[select firstOnly custTable;]]></Source>\n</AxClass>');
  has(result, 0, 'class', 'comment.block.xml');
  has(result, 2, 'public', 'comment.block.xml');
  lacks(result, 0, 'select', 'keyword.');
  has(result, 3, 'AxClass', 'entity.name.tag.localname.xml');
  has(result, 4, 'Example', 'entity.name.type.class.xpp');
  has(result, 5, 'firstOnly', 'keyword.other.query.xpp');
  has(result, 6, 'AxClass', 'entity.name.tag.localname.xml');
});

test('nested block comments retain the outer comment until its own terminator', () => {
  const result = tokenize('/* outer\n  /* inner */\n  select staysCommented;\n  /* middle /* deepest */ stillCommented */\n*/\nttsBegin;');
  has(result, 2, 'select', 'comment.block.xpp');
  has(result, 3, 'stillCommented', 'comment.block.xpp');
  lacks(result, 2, 'select', 'keyword.');
  has(result, 5, 'ttsBegin', 'keyword.control.xpp');
  assert.ok(result.closed);
});

test('bare datetime literals form a single token while quoted timestamps stay strings', () => {
  const result = tokenize('utcdatetime stamp = 2026-10-05T12:34:56;\nutcdatetime lower = 2026-10-05t12:34:56;\nstr text = "2026-10-05T12:34:56";');
  for (const [line, literal] of [[0, '2026-10-05T12:34:56'], [1, '2026-10-05t12:34:56']]) {
    has(result, line, literal, 'constant.numeric.datetime.xpp');
    assert.ok(result.lines[line].tokens.some(token => token.text === literal));
  }
  has(result, 2, '2026-10-05', 'string.quoted.double.xpp');
  lacks(result, 2, '2026-10-05', 'constant.numeric.');
});

test('binary and unsigned integer literals do not consume identifier prefixes', () => {
  const result = tokenize('int bits = 0b1010 + 0B0011;\nint mask = 0xFFFFFFFFu;\nint value = 4294967295U;\ninvalid = 0b102 + 123Unit + 0xFFUser;');
  for (const literal of ['0b1010', '0B0011']) has(result, 0, literal, 'constant.numeric.binary.xpp');
  has(result, 1, '0xFFFFFFFFu', 'constant.numeric.hex.xpp');
  has(result, 2, '4294967295U', 'constant.numeric.xpp');
  for (const literal of ['0b102', '123Unit', '0xFFUser']) lacks(result, 3, literal, 'constant.numeric.');
});

test('modern query options and timeOfDay are recognized case-insensitively', () => {
  const result = tokenize('SELECT FIRSTONLY1 GENERATEONLY custTable;\ntimeOfDay startTime;\nNAMESPACE;');
  for (const keyword of ['SELECT', 'FIRSTONLY1', 'GENERATEONLY']) has(result, 0, keyword, 'keyword.other.query.xpp');
  lacks(result, 0, 'SELECT', 'entity.name.type.');
  has(result, 1, 'timeOfDay', 'storage.type.primitive.xpp');
  has(result, 2, 'NAMESPACE', 'keyword.other.namespace.xpp');
});

test('label formats exclude emails, mentions, and label-like prefixes', () => {
  const result = tokenize('info("@SYS123");\ninfo(\'@MyLabels:CreditLimit\');\ninfo(@"@$AB12");\ninfo("rod@example.com");\ninfo("hello @SYS123");\ninfo("@SYS123suffix");\ninfo("@MyLabels:CreditLimit suffix");');
  has(result, 0, '@SYS123', 'constant.other.label.xpp');
  has(result, 1, '@MyLabels:CreditLimit', 'constant.other.label.xpp');
  has(result, 2, '@$AB12', 'constant.other.label.temporary.xpp');
  for (const [line, text] of [[3, '@example'], [4, '@SYS123'], [5, '@SYS123suffix'], [6, '@MyLabels:CreditLimit']]) {
    lacks(result, line, text, 'constant.other.label.');
  }
});

test('member names preserve their role when they resemble language keywords or intrinsics', () => {
  const result = tokenize('obj.select();\nobj . firstOnly();\nthis.str = obj.true;\nobj.tableStr();\nSELECT custTable;');
  for (const [line, name] of [[0, 'select'], [1, 'firstOnly'], [3, 'tableStr']]) {
    has(result, line, name, 'entity.name.function.xpp');
    lacks(result, line, name, 'keyword.');
    lacks(result, line, name, 'support.function.');
  }
  for (const name of ['str', 'true']) has(result, 2, name, 'variable.other.member.xpp');
  has(result, 4, 'SELECT', 'keyword.other.query.xpp');
});

test('qualified type names and custom return types are recognized in declarations', () => {
  const result = tokenize('System.IO.StreamReader reader;\npublic CustGroupId groupName()\n{\n    return "10";\n}');
  has(result, 0, 'System.IO.StreamReader', 'entity.name.type.xpp');
  has(result, 1, 'CustGroupId', 'entity.name.type.xpp');
  has(result, 1, 'groupName()', 'entity.name.function.xpp');
});

test('variable-length hexadecimal escapes remain inside ordinary strings', () => {
  const result = tokenize(String.raw`str text = "\x41 \x041 \x0041 \u0041";`);
  for (const literal of [String.raw`\x41`, String.raw`\x041`, String.raw`\x0041`, String.raw`\u0041`]) {
    has(result, 0, literal, 'constant.character.escape.xpp');
    assert.ok(result.lines[0].tokens.some(token => token.text === literal));
  }
});

test('global macros use directive and definition scopes', () => {
  const result = tokenize('#globalmacro.Fields\n    accountNum, creditMax\n#endmacro');
  has(result, 0, 'globalmacro', 'keyword.control.directive.xpp');
  has(result, 0, 'Fields', 'entity.name.constant.xpp');
  has(result, 2, '#endmacro', 'keyword.control.directive.xpp');
});

test('verbatim quotes terminate an X++ literal without a C# doubled-quote escape', () => {
  const result = tokenize('str text = @"one""two";\nttsBegin;');
  has(result, 0, 'one', 'string.quoted.double.verbatim.xpp');
  has(result, 0, 'two', 'string.quoted.double.xpp');
  lacks(result, 0, '""', 'constant.character.escape.');
  has(result, 1, 'ttsBegin', 'keyword.control.xpp');
  assert.ok(result.closed);
});
