# npm Publish Checklist

This checklist is for publishing FormalDoc as a Node package that Claude code execution can install and use directly.

## Name Availability

Checked on 2026-03-11 with:

```bash
npm view formaldoc name version --json
npm view @shrektan/formaldoc name version --json
```

Both lookups returned `404 Not Found`, which means both package names appear to be available at the time of writing.

## Recommended Package Name

- First choice: `formaldoc`
- Fallback: `@shrektan/formaldoc`

Use the unscoped name only if you want the shortest possible install command in Claude:

```bash
npm install formaldoc
```

## Before Publishing

1. Confirm the package name you want to publish.
2. Run:

```bash
npm run format
npm run lint
npm run build
npm run package:check
```

3. Confirm the published entrypoints are correct:
   - Library import: `formaldoc`
   - CLI binary: `formaldoc`
4. Log in to npm:

```bash
npm login
```

## Publish

For the unscoped package:

```bash
npm publish
```

For the scoped package:

```bash
npm publish --access public
```

## After Publishing

Validate install:

```bash
npm install formaldoc
node -e "import('formaldoc').then((m) => console.log(Object.keys(m)))"
npx formaldoc --help
```

If you use the scoped package instead:

```bash
npm install @shrektan/formaldoc
node -e "import('@shrektan/formaldoc').then((m) => console.log(Object.keys(m)))"
npx @shrektan/formaldoc --help
```

## Claude Readiness Check

A publish is good enough for Claude code execution when all of these are true:

- `npm install <package-name>` succeeds in a clean environment
- `import { convertMarkdownToDocx } from '<package-name>'` works
- writing `result.buffer` to `output.docx` succeeds
- `npx <package-name> --help` works without local repo context
