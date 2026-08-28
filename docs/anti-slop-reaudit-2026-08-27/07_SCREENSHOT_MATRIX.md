# Proof Margin screenshot matrix

Date: 2026-08-27  
Runtime: installed Chrome 151, opened as a new tab in the user's real Chrome profile  
Local origin: `http://127.0.0.1:4322`

The raster width can be 15–16 pixels narrower than the emulated CSS viewport because Chrome excludes its vertical scrollbar from the captured document width. Overflow judgments compare `scrollWidth` with `innerWidth`; no page-level horizontal overflow was observed. “Zoom equivalent” means the same CSS-pixel reflow pressure at a narrower viewport, not a claim that Chrome's zoom UI was changed.

| Image | CSS viewport / setup | Visible result | Reflow, focus, interaction | Disposition |
|---|---|---|---|---|
| `01-landing-390x844-profile-chrome.png` | 390 × 844, `/` | Core learner/page/proposal/choice transaction and primary CTA | Decision controls remain in the first viewport; no horizontal page overflow | Pass |
| `02-landing-desktop-profile-chrome.png` | 1707 × 900 effective desktop, `/` | Full landing hierarchy and six-tool boundary | Single H1 and one primary `/learn` action | Pass |
| `03-empty-unavailable-1440x900.png` | 1440 × 900, `/learn`, empty session, final build | Empty composer plus truthful “WebMCP unavailable” state | Current “first unresolved relation” guidance; controls remain visible | Pass after recapture |
| `04-empty-unavailable-320x800.png` | 320 × 800, empty session, final build | Empty-state mobile reflow | Current copy; one-column flow; no page overflow | Pass after recapture |
| `05-broken-diagnosis-1440x900.png` | 1440 × 900, checked broken derivation | First broken relation and local diagnosis | Failure is textual and line-local | Pass |
| `06-broken-diagnosis-720x900.png` | 720 × 900 | Same broken relation at tablet width | Proof rows reflow without detaching evidence | Pass |
| `07-broken-diagnosis-390x844.png` | 390 × 844 | Same broken relation at mobile width | Diagnosis remains adjacent to the line | Pass |
| `08-local-inspector-annotation-1440x900.png` | 1440 × 900, inspector expanded | Inspector/tool surface with annotation state | Secondary machinery remains subordinate | Pass |
| `12-policy-refusal-recovery-1440x900.png` | 1440 × 900, premature local-inspector proposal, final build | Current post-check two-attempt refusal and recovery | Refusal is inline, attributed, and actionable | Pass after recapture |
| `13-policy-refusal-recovery-390x844.png` | 390 × 844, final build | Mobile current refusal state | Recovery remains readable with no clipping | Pass after recapture |
| `14-proposal-not-applied-1440x900.png` | 1440 × 900, eligible local-inspector proposal with tester-authored math | “Proposed replacement — not applied” with learner decision | Inspector template stays answer-blank; proposal cannot silently alter proof | Pass after recapture |
| `15-proposal-not-applied-390x844.png` | 390 × 844, same final proposal | Mobile proposal state | Keyboard-scrollable math; “Use this” and “Keep mine” remain reachable | Pass after recapture |
| `16-guided-practice-complete-1440x900.png` | 1440 × 900 | Checked guided round complete | Completion does not overclaim mastery | Pass |
| `17-guided-practice-complete-390x844.png` | 390 × 844 | Mobile guided completion | Primary continuation remains reachable | Pass |
| `18-fresh-unaided-transfer-1440x900.png` | 1440 × 900, new problem, final build | Fresh unaided round with current unresolved-language guidance | Prior answer is not copied into the new proof | Pass after recapture |
| `19-fresh-unaided-transfer-390x844.png` | 390 × 844, completed fresh round, exact CDP viewport | Mobile unaided round with three page-checked lines | Compact rail-free layout; composer and problem premise remain usable | Pass after repair |
| `20-unaided-coaching-lock-1440x900.png` | 1440 × 900, attempted agent coaching | Annotation/proposal lock with recovery | The page visibly enforces the no-coaching phase | Pass |
| `21-immediate-transfer-evidence-1440x900.png` | 1440 × 900, completed fresh round, final build | Truthful generated-not-answer-bank signal; no annotation/proposal; reading/checking caveat | Evidence and limits are stated together | Pass after recapture |
| `22-immediate-transfer-evidence-390x844.png` | 390 × 844, final build | Mobile current transfer signal | Signal remains legible and bounded | Pass after recapture |
| `23-transfer-evidence-panel-1440x900.png` | 1440 × 900, final `get_receipt` inspector output | Eight-round cap, totals/truncation, actor-specific provenance, limitations | Raw bounded JSON remains keyboard-scrollable and inspectable | Pass after recapture |
| `24-transfer-evidence-panel-390x844.png` | 390 × 844, same final receipt | Mobile bounded evidence panel | Dense details remain contained and readable | Pass after recapture |
| `25-zoom-125-equivalent-1152x800.png` | 1152 × 800 CSS-width equivalent | 125% reflow pressure | No horizontal page overflow | Pass |
| `26-zoom-150-equivalent-960x800.png` | 960 × 800 equivalent | 150% reflow pressure | Hierarchy remains coherent | Pass |
| `27-zoom-200-equivalent-720x800.png` | 720 × 800 equivalent | 200% reflow pressure | Proof and evidence stay associated | Pass |
| `28-zoom-400-equivalent-320x800.png` | 320 × 800 equivalent | 400% / 320 CSS px reflow pressure | One-column layout; long content contained | Pass |
| `29-keyboard-focus-visible-390x844.png` | 390 × 844, keyboard navigation | Focused “Check my work” control | 2.67 px blue outline; focus not obscured | Pass |
| `30-reduced-motion-390x844.png` | 390 × 844, `prefers-reduced-motion: reduce` | Same usable state without ornamental motion | Transition duration resolves to 0.001 s; smooth scroll disabled | Pass |
| `31-loading-mathematics-engine-1440x900.png` | 1440 × 900, JavaScript temporarily blocked | Server-readable loading state | Page states why controls are unavailable; restored after reload | Pass |
| `32-cross-tab-conflict-1440x900.png` | 1440 × 900, second profile tab edits session | Frozen stale-tab conflict state | Writes stop instead of overwriting | Pass |
| `33-cross-tab-conflict-390x844.png` | 390 × 844 | Mobile conflict state | Recovery remains reachable | Pass |
| `34-cross-tab-conflict-alert-390x844.png` | 390 × 844, alert focused | Explicit conflict alert | Actor sees cause and “Start over” recovery | Pass |
| `35-long-math-internal-scroll-320x800.png` | 320 × 800, overlength draft | Length guard under hostile input | Input remains bounded; rejection is announced | Pass |
| `36-long-math-bounded-320x800.png` | 320 × 800, accepted long expression | Long rendered math contained inside its owner | No page-level overflow | Pass |
| `37-invalid-input-recovery-390x844.png` | 390 × 844, 257-char reject → valid Add | Valid line appears and obsolete length error is gone | Live-region state follows the successful learner action | Pass after repair |
| `38-unreadable-line-recovery-390x844.png` | 390 × 844, `(` then Check, recaptured after pedagogy/mobile repair | Parser truth, “first unresolved line,” and a concrete rewrite/check recovery | Compact rail-free row; remove target stays beside the expression; no false “does not follow” claim | Pass after repair |
| `39-landing-laptop-1024x768.png` | 1024 × 768 first viewport, `/` | Laptop landing headline and complete transaction | Clean non-stitched capture; no horizontal page overflow | Pass after repair |

## Coverage gaps

- Connected WebMCP: blocked in this Chrome profile because `document.modelContext` is unavailable until the WebMCP testing flag is enabled and Chrome is relaunched. The unavailable state is verified and truthful; connected proof is not fabricated.
- Browser zoom UI: the 125/150/200/400 rows are CSS-width equivalents. They prove responsive reflow but are not represented as literal browser-zoom telemetry.
