# X++ syntax

TextMate syntax highlighting for Microsoft Dynamics 365 Finance and Operations
X++, plus the original Vim syntax for Dynamics AX exports.

The TextMate grammar is [syntaxes/xpp.tmLanguage.json](syntaxes/xpp.tmLanguage.json).
Its scope is `source.xpp`. It covers classes, extension attributes, queries,
transactions, macros, labels, strings, comments, literals, and intrinsic functions.
Keywords match case-insensitively. D365 `AxClass` XML documents retain XML
highlighting, with X++ highlighting in the `Declaration` and `Source` CDATA.
The XML wrapper uses the standard `text.xml` grammar.

The grammar covers nested block comments, binary and unsigned integer literals,
bare datetime literals, legacy/modern/temporary labels, and global macros.
Compile-time function coverage includes the metadata forms documented in
[Microsoft Learn](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/dev-ref/xpp-compile-time-functions).
Type references are inferred from declarations and surrounding syntax. A host
language service can add metadata resolution and semantic classification.
The host's theme selects colors for the token scopes.

## GitHub Markdown

The proposed [Linguist](https://github.com/github-linguist/linguist) integration
registers the `xpp` alias, so a fenced code block can use:

````markdown
```xpp
ttsBegin;
while select forUpdate custTable
    where custTable.CustGroup == "10"
{
    custTable.CreditMax = 5000;
    custTable.update();
}
ttsCommit;
```
````

GitHub.com will support this fence after the Linguist contribution is accepted,
released, and deployed. Adding this grammar to an individual repository does not
enable GitHub highlighting by itself.

## Develop

Requires Node.js 22 or later:

```sh
npm ci
npm test
npm run preview
```

Tests use the VS Code TextMate engine and Oniguruma. They cover raw X++ and real
D365 class metadata. The preview command writes local HTML files to `preview/`.
The grammar also needs to pass Linguist's PCRE grammar compiler before submission.

## Vim

The original [syntax/xpo.vim](syntax/xpo.vim) highlights Dynamics AX `.xpo` exports.
Its keyword and type inventory is the baseline for the TextMate grammar. Tests
check that every entry is covered, including lowercase and uppercase spellings.
D365 additions follow [Microsoft's X++ language reference](https://learn.microsoft.com/en-us/dynamics365/fin-ops-core/dev-itpro/dev-ref/xpp-language-reference).

## License and authorship

MIT. Author: Rod Fraga <303538+fraga@users.noreply.github.com>.
Third-party test fixtures and their licenses are listed in
[THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md).
