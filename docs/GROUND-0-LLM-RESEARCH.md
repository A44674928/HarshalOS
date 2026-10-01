# Ground-0: diagnosing an empty model reading

A successful **LINK ESTABLISHED** probe proves that a short text request reached a model and returned text. It does **not** test source coverage, JSON output, quotation accuracy, dates, or Ground-0 interpretation.

## What the original zero-result summary does and does not establish

A run reporting 17 records, about 5,000 characters, and 54 staged calls sent roughly 300 characters per record on average. With three records per batch and nine questions per batch, six batches already account for 54 calls. The source text is repeated for each question; 67,000 input tokens do not mean 67,000 tokens of distinct evidence were retrieved.

Zero verified quotes **and zero discarded readings** do not establish that the quotation checker rejected the model's work. The old summary omitted several distinct outcomes:

- The model explicitly returned `unknown`.
- It returned prose, incomplete JSON, or JSON with the wrong fields/enums.
- It named a question other than the one asked.
- A real quotation matched, but its date or historical version did not qualify.
- A provider/transport call failed.

The original summary alone cannot tell which happened in a particular run. Do not turn that ambiguity into a finding about an organization, and do not tune prompts to reach a target number of YES answers.

## Reading diagnostics

The research and individual-artifact review panels now show **Reading diagnostics**. When there are no eligible candidates, the details open by default. They report:

| Diagnostic | Meaning / next step |
| --- | --- |
| Stored text vs excerpt-only records | Stored text may itself be bounded or short. Retrieve primary page text rather than adding repeated calls over snippets. |
| Records under 400 characters | A thin-source warning, not a scoring threshold or proof of missing evidence. |
| News/indexed leads not sent | Leads remain in the source list but cannot support findings. They no longer consume nine audit calls per batch. |
| No source date / outside cutoff | Quotes can be located for review but are held, not scored. Supply a qualifying dated artifact or verified archive capture. |
| Explicit UNKNOWN answers | Usable model output saying that the supplied records do not support an answer. Not a proven negative or an exhaustive public-record search. |
| Non-JSON / wrong-shape replies | A serialization/schema failure, not a silent source record. Inspect the question/source IDs and retry with a model that can return the requested JSON. |
| Output-limit stops | The provider reported `length` / `max_tokens` / `MAX_TOKENS`. Partial replies are not used, even when a nested fragment looks valid. |
| Provider/transport failures | A question's staged call did not complete. Existing quota, pacing, timeout, cancellation, and fatal-error behavior still applies. |
| Held matches / rejected quotes | Held matches have a date/version problem; rejected quotes did not qualify. Neither is selectable. |

The diagnostic envelope includes per-call question codes, source IDs, outcome, and provider stop reason. It stores no raw model response, private reasoning, or credentials. Diagnostics and staging metadata survive audit-input normalization; imported diagnostic detail is bounded to 120 call rows.

## Implementation changes

- Research stores retrieved Markdown, including links, rather than stripping all links from stored page text. This restores the existing constrained follow-up reader: it can request only links actually present in the stored record, using the same public reader/archive/cutoff path. **Re-run research to repair old flattened records**; asking the model to read an old draft again cannot restore links that were not saved.
- Official page storage and model packing share a 20,000-character per-source limit. The model-reading budget is 150,000 characters across initial and followed records; long or budget-shortened text is disclosed. These are bounded stored records, not a claim to have read every public document in full.
- Ground-0 opts into `response_format: {"type":"json_object"}` through the Z.AI relay and JSON MIME output through Google's SDK. The relay reconstructs only that minimal formatting object; arbitrary schemas, provider tools/functions, and streaming remain unsupported. Other BYOK compatible endpoints retain their existing request shape.
- The prompt lists the actual global SOURCE indexes for each batch, uses legal enum examples, and distinguishes locating text from scoring it. Dates come from source records, never from a model-proposed date.
- A missing/invalid structured reply receives at most one format retry for that call, with a maximum of **two extra calls per run**, using the same sources and no higher output ceiling. Valid UNKNOWN answers and rejected quotations are **not retried to seek a positive answer**.
- Only the questions asked and the source text actually supplied in that call can carry a candidate. Missing/null/boolean source indexes cannot silently coerce into SOURCE 0. B4/C2 details are attached to their own verified candidate, not a summary from an unrelated question or batch.
- A reader's explicit `scoringEligible: false` flag survives source normalization and blocks phase credit. A live page without a verified historical version cannot be promoted merely because it has an older publication date.
- Review panels show unsupported constraints as UNKNOWN rather than presenting an unquoted false value as a supported NO. Individual-artifact coverage counts only chosen, eligible, quote-backed candidates.

Quote matching uses the existing whitespace, case, typographic, and checked ellipsis-fragment normalization. It is **not fuzzy semantic matching**, and it does not prove source authenticity, completeness, or the correctness of a model's interpretation. Human selections remain explicit; no reading issues a formal badge or exercises the HOS authority plane.

## A useful next run

1. Re-run automatic research for the intended organization and cutoff to capture the updated source record.
2. Check the official-page and archive coverage rows. If these are unavailable, add/read a primary artifact in the Evidence library rather than expecting news metadata to answer institutional questions.
3. Read the record with the linked model and open **Reading diagnostics**.
4. Address the identified failure category before changing models or raising budgets. Compare models only against the **same** source text, cutoff, and framework version.
5. Review each eligible quotation and its scope before ticking it. A run can correctly remain partly or entirely UNKNOWN.

## Regression coverage

`npm run test:llm` includes `tests/g0-llm-diagnostics-test.mjs`: the real browser connector and Worker relay run against deterministic, mocked provider responses. It covers lead-only preflight, stable source indexes, recovery from non-JSON output, bounded schema retries, truncation metadata, source-scope enforcement, date/version holds, candidate-bound B4 metadata, constrained follow-ups, and JSON parsing without partial-root salvage. Research, application, and desktop suites cover retained links, review diagnostics, quote-backed coverage counts, and ticker-search interactions. These tests do not establish live GLM accuracy or a production security guarantee.
