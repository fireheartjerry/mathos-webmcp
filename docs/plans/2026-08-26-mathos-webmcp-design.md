# Mathos WebMCP Product Design

**Date:** August 26, 2026

**Status:** Approved for implementation planning

**Entrant:** Mathos as an organization
**Product name:** The human team will select the final name

## 1. North Star

The goal is to win the OpenAI WebMCP Challenge with a real frontier learning product.

The product starts with calculus. It ends when the learner trains and fixes a small transformer.

The system changes the learning path from the learner's visible work. The learner and the agent use the same workspace.

The product is not a course with a chatbot. It is a learning system that changes itself around the learner.

## 2. Product Promise

Working promise:

> Begin with calculus. End with a transformer that you trained.

Long-term thesis:

> A course stays fixed. Mathos grows with the learner.

The YC Primer is the main story reference. It describes a tutor that grows with a learner over time.

Sarsa is the main visual reference. The page uses quiet type, open space, and purposeful motion.

The project will not copy either reference. It will use their clarity, restraint, and ambition.

## 3. Winning Filter

Each product decision must improve one or more of these goals:

- WebMCP use
- Demo clarity
- Product reliability
- Clear educational impact
- Creativity and ambition

WebMCP use is the first tie-breaker. The product must make WebMCP necessary to the experience.

## 4. Core Learning Loop

Each learning cycle uses the same seven steps:

1. The learner attempts a problem.
2. WebMCP reads the current workspace state.
3. Mathos finds a bounded mistake or records uncertainty.
4. The page changes the idea into a clearer form.
5. Mathos creates or selects a focused video.
6. The learner attempts a fresh problem.
7. The page records the new evidence and changes the path.

The system does not claim permanent mastery from one answer. It records what the learner showed in the current session.

## 5. Learner Path

The learner-facing path uses ten stages:

1. **From slopes to learning** — how calculus helps a model improve
2. **Numbers with direction** — how vectors describe meaning
3. **Following cause and effect** — how one calculation influences another
4. **Learning from mistakes** — how errors travel backward through a model
5. **Getting better step by step** — how training improves predictions
6. **Choosing among possibilities** — probability, confidence, and surprise
7. **Turning words into meaning** — tokens and embeddings
8. **Deciding what matters** — attention
9. **Building a transformer** — how the complete system fits together
10. **Teach your own tiny model** — train it, observe it, and fix its mistakes

The product can show the standard technical term after it explains the idea in plain language.

## 6. Adaptive Learning Rules

Each idea has five parts:

- Required earlier knowledge
- Clear success evidence
- Common mistakes
- Useful lesson forms
- Fresh follow-up problems

The route uses these rules:

1. A short challenge measures the learner's current skill.
2. Clear success lets the learner move forward.
3. A known mistake opens a focused lesson.
4. A repeated mistake opens an earlier supporting idea.
5. An unclear answer does not produce a guessed diagnosis.
6. A fresh problem measures whether the lesson helped.

Strong learners can skip ideas after they show clear evidence. Learners with gaps receive short supporting branches.

## 7. Evidence Receipt

Each completed loop creates a visible receipt. The receipt explains:

- What the learner tried
- What Mathos found
- What lesson Mathos provided
- What changed in the second attempt
- What the learner can study next
- What the evidence does not prove

The receipt is evidence of immediate transfer. It is not proof of permanent mastery.

## 8. Frontier Product Standard

The product must meet these conditions:

- Real work changes the path.
- Different mistakes produce different lessons.
- Different mistakes can produce different Mathos videos.
- Learners can skip ideas that they already understand.
- One idea can change between an equation, picture, graph, simulation, and video.
- The agent works in the learner's visible workspace.
- Every successful agent action changes visible page state.
- Fresh problems measure learning after each lesson.
- The final transformer trains and produces changing results.
- The learner can connect each transformer part to an earlier idea.

A static lesson, a scripted chatbot, or fake model training does not meet this standard.

## 9. System Boundary

The project uses a hybrid system.

### 9.1 Public challenge core

The public repository contains a complete learning experience:

- The learner path
- The competency graph
- The problem bank
- The mistake library
- The route rules
- The answer checks
- The visual lessons
- The transfer generator
- The evidence receipts
- The WebMCP tools
- The human controls
- The tests and setup instructions

This core works without private Mathos infrastructure.

### 9.2 Mathos production connection

Mathos Video Generation is the signature production connection.

The hosted product uses the real Mathos service. The public core has cached Mathos videos and a local visual lesson.

The service cannot control diagnosis, route changes, answer checks, or receipts. A service error cannot stop the learning loop.

This boundary keeps the open-source project complete. It also shows a real Mathos capability.

## 10. Technical Shape

### 10.1 Astro shell

Astro builds the landing page and other mostly static pages. These pages load quickly and use little client code.

### 10.2 Learning studio

One interactive client area contains:

- The learner path
- The current problem
- The work area
- The visual lesson
- The Mathos video
- The evidence receipt
- The WebMCP activity bar

### 10.3 Public learning engine

The public engine uses versioned data for the path, problems, mistakes, lessons, and routes.

The engine owns all state changes. Human controls and WebMCP tools call the same engine functions.

### 10.4 Mathos video adapter

A server endpoint protects the Mathos credential. It accepts bounded lesson data and returns safe job states.

The adapter stores reusable results. The adapter does not receive the learner's identity.

### 10.5 Local learner state

The browser stores the current session. A learner can reload the page and continue without an account.

## 11. WebMCP Tool Contract

The page uses the raw `document.modelContext.registerTool()` interface. It registers five public tools one time after the session loads.

### `get_learning_workspace`

This read-only tool returns the current stage, idea, attempt state, revision, and valid next actions.

It does not return a hidden answer or raw private content.

### `check_current_attempt`

This write tool checks the visible attempt. It commits a bounded diagnosis, evidence, or an undecided result.

### `show_targeted_lesson`

This write tool shows the correct local lesson. It also starts or selects the related Mathos video.

The video is part of the lesson outcome. The product does not expose a generic video-generation tool.

### `start_transfer_problem`

This write tool creates a fresh problem after the lesson appears. The new problem does not reuse the first answer.

### `get_learning_receipt`

This read-only tool returns the completed evidence receipt and the recommended next path node.

### Tool rules

- Each write requires an expected revision and a request ID.
- A stale revision cannot change state.
- A repeated request cannot create a second change.
- A tool promise resolves after the visible page update.
- The tools call application functions. They do not click or inspect page elements.
- The tools never return a correct answer before the learner submits an attempt.
- The page shows each tool action in the activity bar.
- The page detects WebMCP support before it registers the tools.
- Each input uses a closed and bounded schema.
- Each result contains bounded text and structured data.
- Read tools use `readOnlyHint: true`.
- Write tools use `readOnlyHint: false`.
- Tools mark learner content as untrusted content when required.
- Each write is atomic and respects the execution abort signal.
- A canceled video request cannot remove the local lesson.
- The app does not use cross-origin frames for tool state.

## 12. Mathos Video Experience

The video flow uses these steps:

1. Mathos records a specific mistake.
2. The page shows a useful local lesson immediately.
3. The video adapter requests or selects a short video.
4. The learner can continue while a new video loads.
5. The page shows the video in the same workspace.
6. A fresh problem follows the lesson.

The video input contains:

- The current idea
- The mistake code
- The learner's current level
- The selected teaching form
- The skill required for the next problem

The video does not contain the answer to the next problem.

Known mistake patterns can use cached Mathos videos. The page gives cached videos an accurate label.

Each video includes captions and a text summary.

## 13. Strategic Hardcoding

Hardcoded content improves truth, speed, and reliability when the content has a clear educational purpose.

The project can hardcode:

- The competency graph
- Common mistake patterns
- Golden demo states
- Deterministic diagnoses
- Transfer checks
- Mathos-generated cached videos
- Recovery states

The project cannot fake a live service call or an agent action. The demo must describe cached and live results accurately.

## 14. Page Experience

### 14.1 Landing page

The landing page uses a quiet and minimal layout.

The hero shows an equation that changes into a learning path. One main action starts the first challenge.

The page tells a clear story before it lists features. Mathos company evidence appears after the product proof.

### 14.2 Learning studio

The left side shows the learner path. The center shows the problem and lesson. The right side shows the video and guidance.

A small activity bar shows each WebMCP action. The path changes after each answer.

### 14.3 Motion

Equations can change into graphs, vectors, and attention maps. New path branches appear when Mathos finds a gap.

The page includes captions, keyboard controls, and a reduced-motion mode.

### 14.4 Sarsa design reference

The local Sarsa landing page is the implementation reference for visual quality. Its source is in `C:\Jerry\Important\Coding\Kryonic\apps\landing`.

The Mathos page keeps these Sarsa principles:

- Minimal static design and maximal purposeful motion
- One visual idea that changes across the full hero
- Plain Astro components for the landing page
- Vanilla TypeScript and GSAP for the hero sequence
- Self-hosted fonts
- No generic feature-card grid
- No gradient text, glass panels, or decorative technology labels
- A complete reduced-motion design
- A designed mobile sequence instead of a smaller desktop scene

The Mathos visual idea is an equation that becomes a learning path. That path later becomes a transformer.

The project does not copy the Sarsa brand mark, colors, words, or business layout.

## 15. Hero Demonstration

The learner understands the chain rule on paper. The learner misses one path in a small calculation graph.

WebMCP reads the current work. Mathos shows the missing path and provides a focused video.

The learner then solves a fresh example that connects the same idea to attention. The next transformer node opens.

This sequence shows the full product idea in one short loop:

- Earlier knowledge
- A real mistake
- A visible agent action
- A changed lesson
- A Mathos video
- A fresh problem
- New evidence
- A changed path

## 16. Trust and Recovery

- If Mathos cannot read an answer, the page says so.
- If two checking methods disagree, the result stays undecided.
- If the state changes, an old agent action cannot change the new state.
- If video generation stops, the local lesson remains available.
- If WebMCP is unavailable, each action still has a human control.
- If the learner reloads the page, the current session returns.
- If the network stops, completed local work remains safe.
- If an agent acts, the activity bar shows the action and result.
- The public tools do not return unsafe page content.
- The video adapter receives structured lesson data, not a learner identity.

## 17. Language Standard

The complete project uses pragmatic Simple English.

This standard applies to:

- Landing-page copy
- Lessons
- Buttons and navigation
- Tool descriptions and results
- Error messages
- Video prompts and scripts
- The README
- Setup instructions
- The Devpost text
- Demo narration
- Code comments and technical documents

The project uses short sentences, active voice, and one name for each idea. The project explains a technical term before it relies on that term.

Marketing copy can stay persuasive. Instructions and error messages use stricter language rules.

## 18. Test Plan

### 18.1 Learning tests

- A correct answer moves the learner forward.
- Different mistakes produce different lessons.
- A repeated mistake opens the correct earlier idea.
- A new problem follows each completed lesson.
- A new problem cannot reuse the first answer.
- A receipt matches the visible work.

### 18.2 WebMCP tests

- The agent selects the correct tool for each request.
- Invalid tool order produces a clear message.
- Old revisions cannot change new work.
- Human and agent actions produce the same result.
- Each successful tool changes the visible page.
- No tool exposes a hidden answer.

### 18.3 Product tests

- The full journey works in the ChatGPT browser.
- The full journey works in Chrome 149 or later with WebMCP enabled.
- A reload restores the exact session.
- Local actions complete in less than 500 milliseconds at the 95th percentile.
- Keyboard navigation works.
- Videos include captions and text.
- Reduced-motion mode removes large animations.
- The browser reports no console errors.

## 19. Devpost Compliance Contract

The project follows the live rules for the OpenAI WebMCP Challenge.

- Mathos enters as the organization.
- Mathos appoints an eligible and authorized representative.
- The submission identifies the standalone challenge application as a new project.
- The provenance document still identifies each existing Mathos service.
- The repository becomes public before submission.
- The repository includes a visible open-source license.
- The repository contains all files required for the public core.
- The live project works in the ChatGPT browser and supported Chrome.
- The judge path is free and preferably needs no login.
- The submission explains why WebMCP improves the experience.
- The submission explains what the learner and agent do together.
- The submission describes the WebMCP implementation.
- The demo video is public on YouTube and shorter than three minutes.
- The video includes audio and shows the real product.
- The live product functions as the text and video describe it.
- The project uses only authorized services, data, and media.
- The submission separates existing Mathos systems from challenge-period work.
- The team does not change the submitted repository, site, or entry during judging.

## 20. Provenance Boundary

Existing Mathos systems include the production video service and other company infrastructure.

Challenge-period work includes this standalone application, its public learning engine, the WebMCP tools, the path, and the evaluation system.

The repository will contain a dated provenance document. The commit history will support each claim.

Company facts will use clear sources. Company scale supports the impact claim. It does not replace product evidence.

## 21. Judge Evidence

The final submission includes:

- A working live URL
- A public repository
- An open-source license
- A short and clear README
- A one-minute judge path
- A public evaluation report
- A browser test matrix
- A provenance document
- A security and privacy note
- A public demo video shorter than three minutes

The first part of the demo shows a real WebMCP action and a visible page change.

## 22. Non-Goals

The first release does not need:

- A required user account
- A full copy of every Mathos production feature
- A generic chat assistant
- A large list of WebMCP tools
- A private service that controls the learning path
- Claims of permanent mastery
- Claims that WebMCP removes all prompt-injection risk
- Fake live generation

## 23. Open Decisions Before Implementation

The implementation plan must resolve these items:

- The final human-selected product name
- The exact Mathos Video Generation interface
- The open-source license
- The client framework inside the Astro learning studio
- The small transformer runtime and data set
- The first bounded problem families for all ten stages
- The final verified Mathos company claims

These decisions do not change the approved product direction.

## 24. Primary References

- [The WebMCP Challenge](https://webmcp.devpost.com/)
- [Official challenge rules](https://webmcp.devpost.com/rules)
- [WebMCP specification source](https://github.com/webmachinelearning/webmcp)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [OpenAI WebMCP guidance](https://learn.chatgpt.com/docs/webmcp)
- [YC Requests for Startups: The Primer](https://www.ycombinator.com/rfs#the-primer)
