# Learnings

<!-- Hard-won insights: what worked, what failed, non-obvious pitfalls. -->
<!-- Max 100 lines. Newest first. -->

## 2026-04 | AST text preprocessing must clean ALL string fields, not just `value`

The CJK emphasis flanking fix inserts ZWS into raw markdown before parsing, then
strips it from AST nodes. Initially only cleaned `value` fields — missed `url` on
link/image nodes, silently corrupting hyperlinks containing `*`. Rule: any
preprocessing that mutates raw markdown must audit every string-bearing AST field.

## 2026-04 | npm publish requires browser OTP authentication

`npm publish` on this machine triggers EOTP — must run interactively (`! npm publish`)
to complete the browser auth flow. Cannot be automated in headless Claude Code.

## 2025-02 | CLI tests are inherently slow

Each CLI test spawns a subprocess (~19s total). Use `bun run test:fast` during
development to skip these. Full suite only before commits.

## 2025-01 | KaTeX error handling matters

Some LaTeX from ChatGPT uses non-standard commands. The latex-preprocessor
auto-detects and normalizes bare LaTeX before KaTeX parsing to avoid failures.

## 2025-01 | Word style alignment must be explicit

ListParagraph and BlockQuote styles need explicit justified alignment set
in the style definition — Word doesn't inherit alignment from parent styles
as expected.
