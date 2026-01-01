# Clipboard Paste Compatibility (Mobile)

This memo records why rich-text paste handling differs between desktop and mobile browsers, and
how we handle it in FormalDoc.

## Issue

Mobile browsers and in-app WebViews often expose only `text/plain` in the Clipboard API, even when
users copy rich text that includes HTML/RTF. As a result, `clipboardData.getData('text/html')`
returns an empty string on some devices.

## Approach

Current behavior relies on the Clipboard API only:

- If `clipboardData.getData('text/html')` exists, convert it to Markdown.
- Otherwise, allow the browser to paste plain text by default.

This is the most predictable option across the environments we support today.

## Attempted workaround (reverted)

We tried a DOM-based fallback using a `contenteditable` surface to capture rendered HTML after
paste. It did not fix pasting in the Doubao iOS app and introduced other regressions, so the
change was rolled back.

## Notes

- Desktop browsers typically expose `text/html` reliably; mobile does not.
- Some WebViews still only paste plain text, so we fall back safely.
