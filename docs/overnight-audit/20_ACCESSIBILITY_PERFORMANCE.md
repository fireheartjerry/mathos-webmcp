# Accessibility and performance report

Date: 2026-08-27
Route: `/learn`

## Accessibility

Lighthouse navigation/snapshot results:

| Category | Score |
| --- | ---: |
| Accessibility | **100** |
| Best Practices | **100** |
| Agentic Browsing | **100** |
| SEO | 90 |

The only failed SEO item came from an Astro development-toolbar “Learn more” link and is not in
the production build.

Verified directly:

- one descriptive `h1`;
- skip link reaches the scratchpad;
- first Tab focuses the skip link; Enter + Tab reaches the composer;
- composer submits with Enter and focus remains ready for the next line;
- math exposes KaTeX MathML/accessibility text;
- all form controls have labels;
- first-break feedback is textual, not color-only;
- refusals use `role="alert"`;
- status changes use polite live regions;
- disclosure buttons expose `aria-expanded` and `aria-controls`;
- edit/remove targets are at least 44 px;
- global reduced-motion CSS collapses transitions and JavaScript scrolling switches to
  `behavior: "auto"`.

Responsive checks:

- 390×844 mobile: single-column layout, no clipping;
- 720×450 CSS viewport (200% stress equivalent): no horizontal overflow
  (`scrollWidth 705 <= innerWidth 720`);
- 1440×900: checked derivation, composer and actions remain coherent in the first viewport.

## Performance

Cold local load, unthrottled:

| Metric | Result |
| --- | ---: |
| LCP | **106 ms** |
| CLS | **0.00** |
| TTFB | 22 ms |

Cold load with Fast 3G and 4× CPU slowdown:

| Metric | Result |
| --- | ---: |
| LCP | **1.348 s** |
| CLS | **0.00** |
| TTFB | 26 ms |

The production build warns about one ~2.96 MB minified Scratchpad chunk dominated by the local
computer-algebra engine. This is a real optimization opportunity, not a release blocker at the
measured gate. The highest-EV follow-up is to split the math engine behind the already-existing
“Loading the mathematics engine…” state without making first paint or tool registration lie.
