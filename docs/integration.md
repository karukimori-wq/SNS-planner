# SNS Planner Integration

SNS Planner integrates with Growth Engine using the shared contracts repository:

- https://github.com/karukimori-wq/professional-platform-contracts

Primary references:

- `docs/contracts/app-responsibilities.md`
- `docs/contracts/identity-contract.md`
- `docs/contracts/data-ownership.md`
- `docs/contracts/api-catalog.md`
- `docs/contracts/event-catalog.md`
- `docs/repositories/platform-admin.md`

## Integration Direction

SNS Planner is downstream of Growth Engine.

```text
Growth Engine
  -> PostDraft.Generate
SNS Planner
  -> sns.post_draft.created.v1
Growth Engine
```

SNS Planner also supports communication draft creation for Growth Engine-owned
follow-up and contact flows.

```text
Growth Engine
  -> MessageDraft.Generate
SNS Planner
  -> sns.message_draft.created.v1
Growth Engine
```

Professional Studio products must not depend on SNS Planner directly.

Allowed path:

```text
Professional Studio
  -> Growth Engine
  -> SNS Planner
```

Disallowed path:

```text
Professional Studio
  -> SNS Planner
```

Platform Admin may observe SNS Planner through health checks, contract
compliance status, integration logs, event logs, and error summaries. Platform
Admin must not call `PostDraft.Generate` or `MessageDraft.Generate`, create SNS
or message drafts, or become a source of truth for SNS post or communication
planning.

## Synchronous API Flow

Use APIs when Growth Engine needs an immediate draft result.

### 1. Growth Engine prepares the request

Growth Engine decides:

- `purpose`
- `targetAudience`
- `cta`
- `channel`
- `tone`
- `constraints`
- content subject
- campaign context

Example:

```json
{
  "workspaceId": "wks_123",
  "userId": "user_123",
  "campaignId": "campaign_456",
  "subjectId": "subject_789",
  "purpose": "line_registration",
  "channel": "instagram",
  "targetAudience": {
    "age": "30s",
    "gender": "female",
    "interest": "love consultation"
  },
  "subjectProfile": {
    "type": "service_menu",
    "title": "Love Consultation",
    "url": "https://example.com/love-consultation",
    "summary": "A consultation menu for customers who want relationship advice"
  },
  "topic": "love consultation",
  "cta": "Register on LINE",
  "series": "love series",
  "dueDate": "2026-08-15"
}
```

### 2. Growth Engine calls SNS Planner

Operation:

- `PostDraft.Generate`

HTTP route:

- `POST /api/post-drafts`

SNS Planner validates required fields and generates content variants.

SNS Planner must not:

- infer a different target
- choose a different purpose
- change the CTA strategy
- choose the content subject
- decide the customer nurturing intent
- score business value
- decide next campaign action

### 3. SNS Planner returns draft content

Example:

```json
{
  "draftId": "draft_789",
  "posts": [
    {
      "title": "Draft title",
      "content": "Post body",
      "hashtags": ["example"],
      "imagePrompt": "Image prompt",
      "reelScript": "Reel idea",
      "story": "Story idea",
      "channel": "instagram",
      "status": "Draft"
    }
  ]
}
```

Growth Engine reviews the draft and decides whether to show it to the user,
request a rewrite, approve it, or discard it.

## Message Draft Flow

Use `MessageDraft.Generate` only when Growth Engine needs simple contact copy
for a Growth Engine-owned customer, reservation, campaign, or follow-up flow.
It is not a live conversation or reply workflow.

HTTP route:

- `POST /api/message-drafts`
- `GET /api/message-drafts/metadata`

Growth Engine decides:

- who the communication is for
- why it should be sent
- when it should be sent
- which channel should be used
- which CTA and destination should be used
- which customer segment or follow-up stage is relevant

SNS Planner decides only the wording, channel-specific expression, and draft
format.

SNS Planner must not create or manage:

- live conversation state
- Unified Inbox rows
- ConversationContext
- ReplyDraft
- SafetyCheck
- channel send workflow
- cross-person context mixing checks

Those responsibilities belong to Communication Planner.

Example request:

```json
{
  "workspaceId": "wks_123",
  "userId": "user_123",
  "sourceApp": "growth-engine",
  "targetStudio": "numeria",
  "channel": "line",
  "purpose": "followup",
  "audienceSegment": "repeat_customer",
  "tone": "warm",
  "cta": "booking_page",
  "inputRef": {
    "customerId": "cus_123",
    "reservationId": "res_123",
    "campaignId": "camp_123",
    "followupId": "follow_123"
  }
}
```

Example response:

```json
{
  "status": "success",
  "messageDraftId": "msg_draft_123",
  "messageDraftStatus": "draft_created",
  "channel": "line",
  "purpose": "followup",
  "eventName": "sns.message_draft.created.v1",
  "workspaceId": "wks_123",
  "traceId": "trace_123",
  "correlationId": "corr_123",
  "requestId": "req_123"
}
```

Top-level `status` is reserved for observability and must be one of
`success`, `warning`, `error`, or `skipped`. Business state must be returned as
`messageDraftStatus`.

`inputRef` must be reference-id centered. SNS Planner must not receive customer
profile details, payment information, sales amounts, confidential memo text,
Report body text, full meeting transcripts, API keys, access tokens, or secret
prompts.

SNS Planner must also reject live conversation payloads, ConversationContext,
ReplyDraft, SafetyCheck, send workflow state, full message bodies, and full
conversation histories.

### Numeria Studio Message Uses

SNS Planner may create wording for:

- service menu announcements
- booking-page CTA copy
- official LINE broadcast copy
- pre-consultation guidance
- post-consultation thank-you copy
- next consultation prompts
- monthly reading or compatibility campaign copy
- dormant-customer re-contact copy
- SNS post ideas
- CTA copy that points to a Growth Engine-owned booking page

### Velvet Message Uses

Velvet support is limited to lawful adult-business operators and store
managers. SNS Planner must not support minors participating in, accessing, or
being recruited into age-restricted work or services.

SNS Planner may create wording for:

- post-visit thank-you copy
- next-visit prompts
- booking confirmation copy
- re-contact copy for inactive customers
- event notices
- referral request copy
- relationship-aware follow-up copy
- business contact copy
- SNS post ideas
- DM and LINE copy

## Identity Scope

MVP identity scope uses `workspaceId + userId`.

- `workspaceId` is the primary business scope for `PostDraft`, `PostTemplate`,
  post history, and media assets.
- `userId` identifies the logged-in professional operating the feature.
- `ownerUserId` may be used when SNS Planner needs workspace ownership context.
- `professionalId` is not required in MVP.

If `professionalId` appears in shared contracts, SNS Planner must treat it as a
future extension point only. It must not block draft generation, template
listing, JSON import, or media management in MVP.

Systems exchange IDs and snapshots, not duplicated master records. Customer,
lead, reservation, payment, sales, public-site, and service/menu data remain
canonical in Growth Engine. AI Activity and Usage remain canonical in AI
Platform Core.

## Rewrite Flow

Use `PostDraft.Rewrite` when Growth Engine wants a revised draft.

Growth Engine supplies:

- `draftId`
- rewrite instruction
- unchanged business context
- channel constraints

SNS Planner returns the updated draft and must preserve the Growth Engine-owned
business intent.

## Template Flow

Use `PostTemplate.List` when Growth Engine needs available post templates.

SNS Planner may return:

- template id
- template name
- supported channel
- supported format
- required inputs
- optional constraints

Templates must not encode campaign strategy or sales rules. They are formatting
and writing-pattern assets only.

## Event Flow

Use events when SNS Planner draft state changes.

Approved events:

- `sns.post_draft.created.v1`
- `sns.post_draft.updated.v1`
- `sns.message_draft.created.v1`
- `sns.message_draft.updated.v1`

Event payloads must follow:

- `docs/contracts/event-catalog.md`
- `schemas/events/event-envelope.schema.json`

Events must be versioned and past tense.

## Data Storage Rule

SNS Planner may store:

- draft id
- message draft id
- campaign reference id
- workspace reference id
- user reference id
- owner user reference id when ownership checks are required
- content subject reference id
- content subject profile fields required for writing
- post content
- message draft content
- hashtags
- image prompt
- reel idea
- story idea
- channel
- draft state
- created and updated timestamps

SNS Planner must not store as source-of-truth:

- customer master data
- lead status
- follow-up status
- LINE account master
- sales status
- reservation status
- payment state
- payment status
- sales amount
- public site state
- service/menu publishing state
- revenue
- ROI
- LTV
- Business plan entitlement
- AI usage ledger
- Stripe secrets
- customer personal information
- confidential memo full text
- Report body text
- full meeting transcripts
- API keys
- access tokens
- secret prompts

Existing local PWA data may still contain `app_id` because earlier versions were
app-oriented. SNS Planner should accept it only as a backward-compatible alias
for `subject_id`; new integrations should prefer `subjectId` / `subject_id`.

## Implementation Checklist

Before merging cross-system SNS Planner changes:

- Confirm Growth Engine is the only cross-product caller.
- Confirm API operation names match the contracts repository.
- Confirm new events use the `sns.*.v1` prefix and past-tense wording.
- Confirm no customer, lead, revenue, ROI, or Business plan ownership was added.
- Confirm MessageDraft payloads use reference IDs and do not include sensitive
  customer, payment, sales, transcript, Report, token, key, or secret prompt
  fields.
- Confirm payload fields use shared glossary names where available.
- Confirm app-only terminology was not introduced into new integration fields.
- Confirm any new cross-system field, operation, or event is already approved in
  `professional-platform-contracts` before implementation-specific behavior
  depends on it.
