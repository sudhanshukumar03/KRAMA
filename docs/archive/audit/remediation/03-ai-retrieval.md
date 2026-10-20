# AI providers and document retrieval

The AI review found failures in model selection, embedding validation and retrieval filtering, alongside interface actions that did not invoke their backend capability. The repairs aimed to make these paths usable without silently committing AI-generated changes.

## AI-01: model configuration

Chat and narrative services used invalid hardcoded model identifiers and returned provider errors. The repair centralized the model setting so callers shared a supported configuration instead of repeating strings across services.

The original repair record named a particular model and cost map. Those values are historical and should not be copied as current provider recommendations. Available models, quotas and pricing need separate verification when configuration changes. A successful build cannot establish that a live provider accepts a key or model.

## AI-02: validating embeddings

The embedding wrapper did not correctly handle the provider response shape and could produce an empty array. Sending `[]` to a pgvector column failed indexing. The repair required an actual nonempty vector, with validation appropriate to the configured dimensions, before database writes.

An invalid embedding must remain a failed job that can be retried. Replacing it with a zero vector or swallowing the error would hide the outage while damaging retrieval quality.

## AI-03: deleted content and tenant scope

Vector and keyword retrieval needed to filter by the validated workspace and exclude soft-deleted source content. The early record covered both `Document` and the legacy `Page` model; the latter was subsequently removed. The enduring requirement is to check the current source relation, not blindly retain an obsolete join.

## AI-04: project diagnostics

The project diagnostic action showed a success message after a short timer without making an AI request. It was replaced by a real request using project context, with pending, success and failure feedback tied to that request.

## AI-05: reviewed daily debriefs

The narrative endpoint gained a reachable daily-review action. Its output was shown as individual suggestions for tasks, habits and goals, with Accept and Dismiss controls. Accepting an item invoked the relevant mutation and refreshed its readers. Suggestions were not automatically written merely because the AI had returned them.

A failed item must remain recoverable without replaying successful items. This becomes especially important when a suggested workflow contains more than one mutation.

## Follow-up work and verification limits

The original record retained telemetry-analysis and dashboard-insight endpoints for future interface integration. Their presence was not evidence that those interfaces already existed.

Later provider-stream repairs distinguished failure before any output from failure after a response had started. A fallback can be attempted before text is emitted; switching providers partway through a visible answer would splice unrelated output into one response.

The earlier checks covered retrieval filtering, empty-vector failure, reachable diagnostics and per-item debrief review. Later live checks exercised configured providers as described in the [audit overview](../README.md). Repeatable setup and provider-dependent tests are explained in the [development guide](../../../development/README.md).
