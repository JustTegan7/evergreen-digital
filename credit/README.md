# Evergreen footer credit

A small "Site by 🌲 Evergreen Digital" link for the footer of every site Evergreen builds and hosts.

| File | Use |
|---|---|
| `evergreen-credit.html` | Copy-paste snippet for static / HTML sites |
| `EvergreenCredit.jsx` | Drop-in React / Next.js component |
| `tree-mark.svg` | The minimal tree mark on its own |
| `preview.html` | See it on dark, light, and brand-colored footers |

**How to add it to a client site**

1. Paste the snippet (or `<EvergreenCredit client="barclays-salon" />`) at the end of the footer, usually next to the copyright line.
2. Replace `CLIENT-SLUG` with a short client name. Visits then show up in GA4 under source `barclays-salon`, medium `footer_credit`.
3. It inherits the footer's text color, so no styling is needed. Leave the anchor text as the brand name (not keywords like "Everett web design"), which Google treats as a normal credit link.

Add it to the client agreement / SOW as standard so clients aren't surprised by it, with removal available on request.
