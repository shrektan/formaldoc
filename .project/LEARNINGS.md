# Learnings

<!-- Hard-won insights: what worked, what failed, non-obvious pitfalls. -->
<!-- Max 100 lines. Newest first. -->

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
