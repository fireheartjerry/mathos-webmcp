# ChatGPT Desktop Site Tools test record

Date: 2026-08-27
Artifact: current `hackathon-build` working tree
Status: **NOT TESTED — CLIENT ACCESS UNAVAILABLE IN THIS RUN**

The available desktop host is Codex, not the ChatGPT Desktop built-in browser. It does not expose
an eligible ChatGPT Site Tools session or a supported-account/model selector. Therefore no claim
about ChatGPT Desktop execution is made.

What was tested instead:

- ordinary embedded Chrome without WebMCP: complete human fallback and truthful unavailable state;
- standalone Chrome 151.0.7922.174 with `WebMCPTesting`: all six tools and the full production
  journey through `document.modelContext`.

Before submission, an authorized tester with an eligible ChatGPT Desktop account should record:

| Field | Required value |
| --- | --- |
| date/time and timezone | |
| public deployment URL | |
| repository commit SHA | |
| ChatGPT Desktop version | |
| visible model | |
| six tools listed | |
| prompt/tool sequence | |
| stale-state recovery | |
| wrong-phase refusal | |
| final evidence read | |
| console/client failures | |

Suggested prompt sequence is in `18_AGENT_SELECTION_EVAL.md`. Official support guidance:
<https://help.openai.com/en/articles/20001423-using-site-tools-in-the-chatgpt-desktop-app>.
