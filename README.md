# Mathos: From Calculus to Transformers

Mathos turns one calculus mistake into a personal route toward a transformer that the learner trains.

The learner and an agent share one visible learning session. The agent can read the problem, diagnose an attempt, open the right lesson, start a fresh problem, and read the final evidence.

**[Open the deployed demo](https://hackathon-build-eta.vercel.app)**

Backed by Y Combinator · Featured in Forbes · Built for 5M+ learners

## The 60-second judge path

1. Open the demo and select **Start with calculus**.
2. Enter `36` for the first problem.
3. Open the targeted lesson and see the two missing derivative paths.
4. View the Mathos video, then select **Try a fresh problem**.
5. Enter `8` for the transfer problem.
6. Read the evidence receipt, then continue to the ten-stage pathway.
7. Open the training lab and select **Train 100 real steps**.

The model usually completes 100 steps in about 30 seconds on the WebGL backend. The CPU fallback takes longer.

## Use the WebMCP path

Open `/learn` in one of these supported environments:

- The ChatGPT in-app browser, which supports WebMCP by default.
- Google Chrome 149 or later with `chrome://flags/#enable-webmcp-testing` enabled.

Ask the agent to inspect the learning workspace and help with the current attempt. The agent uses these five tools:

| Tool | What it does |
| --- | --- |
| `get_learning_workspace` | Reads the visible problem, stage, revision, and valid next actions. |
| `check_current_attempt` | Checks one answer and moves the same visible session to its honest result. |
| `show_targeted_lesson` | Opens the lesson for the visible diagnosis. |
| `start_transfer_problem` | Starts a fresh problem after the lesson or a correct first answer. |
| `get_learning_receipt` | Reads three narrow evidence claims after the transfer problem passes. |

The complete agent route uses six calls because `check_current_attempt` runs once for each problem. Human controls and agent tools call the same state transition code.

If WebMCP is unavailable, the full human path still works. The header states that the five agent tools are unavailable in that browser.

## What is real

- The page registers exactly five tools with `document.modelContext.registerTool()`.
- Every mutating agent action changes the visible page and appears in the session activity list.
- The Mathos lesson uses a real Mathos-generated video and player.
- **Generate a fresh version** connects to the real Mathos Video Generation stream.
- The TensorFlow.js lab trains a real one-block causal transformer in the browser.
- The loss chart, generated samples, and attention heatmap come from the current model weights.
- The product makes a narrow claim: the receipt proves success on one fresh problem in this session.

The calculus problems, diagnosis route, and ten-stage learning narrative are curated for this demo. The measurements and state changes are not video mockups.

## Tiny transformer facts

The lab uses TensorFlow.js 4.22.0 and selects WebGL when it is available. It falls back to the CPU backend.

- 6,578 trainable parameters
- 16-character context
- 24-value model width
- Two attention heads with 12 values per head
- Token and position embeddings
- Causal self-attention with a future-token mask
- Residual paths and layer normalization
- A `24 → 48 → 24` feed-forward network
- Cross-entropy loss and Adam with a `0.003` learning rate
- Eight short, original Mathos statements as the training corpus

This model is an educational character model. It is not a production LLM.

## Run locally

Install Node.js and pnpm. Then run:

```bash
pnpm install
pnpm dev
```

Open `http://localhost:4321/`.

Create a production build with:

```bash
pnpm build
pnpm preview
```

## Architecture

- Astro renders the landing page and the two routes.
- React owns the interactive learning studio.
- One TypeScript transition layer serves both human controls and WebMCP tools.
- The Mathos video client reads a real server-sent event stream and upgrades from the opening player to the full player.
- TensorFlow.js loads only when the learner enters the final training lab.
- Vercel hosts the static app and forwards the Mathos video-generation route.

## Current limitation

This challenge build fully demonstrates one adaptive shared-path calculus concept. The other pathway stages explain the route to transformers but do not contain separate adaptive lessons yet.

Fresh video generation also depends on the Mathos service. The ready canonical Mathos lesson remains available when a fresh request cannot complete.

Read [PROVENANCE.md](PROVENANCE.md) for the challenge-period boundary. Read [the demo script](docs/DEMO_SCRIPT.md) for the planned public video.
