# Clipboard Paste Compatibility (Mobile)

This memo records why rich-text paste handling differs between desktop and mobile browsers, and
how we handle it in FormalDoc.

## Issue

Mobile browsers and in-app WebViews often expose only `text/plain` in the Clipboard API, even when
users copy rich text that includes HTML/RTF. As a result, `clipboardData.getData('text/html')`
returns an empty string on some devices.

## Approach

We treat the clipboard HTML path as the fast path, but add a DOM-based fallback:

- Let the paste render into a `contenteditable` surface.
- After the paste, read `innerHTML` from the DOM and convert it to Markdown.
- If no rich HTML is present, keep the plain text behavior.

This relies on the browser's rendering behavior instead of the Clipboard API, which is more stable
across mobile environments.

## Notes

- Desktop browsers typically expose `text/html` reliably; mobile does not.
- Some WebViews still only paste plain text, so we fall back safely.
