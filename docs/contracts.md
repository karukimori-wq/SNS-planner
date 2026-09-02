# SNS Planner Contracts

SNS Planner adopts the shared contracts from:

- https://github.com/karukimori-wq/professional-platform-contracts

The contracts repository is the source of truth for cross-system terminology,
ownership, API operation names, event names, and shared schemas. SNS Planner
must not define independent cross-system contracts.

## Required References

- `docs/contracts/platform-boundaries.md`
- `docs/contracts/app-responsibilities.md`
- `docs/contracts/shared-glossary.md`
- `docs/contracts/identity-contract.md`
- `docs/contracts/api-catalog.md`
- `docs/contracts/event-catalog.md`
- `docs/contracts/data-ownership.md`
- `docs/repositories/platform-admin.md`
- `docs/repositories/numeria-studio.md`
- `docs/repositories/sns-planner.md`
- `docs/adoption-guide.md`

## Responsibility Boundary

SNS Planner is a 1-to-many SNS content creation planner used by Growth Engine.

SNS Planner is not limited to app marketing. It supports content marketing for
a Growth Engine-provided content subject, such as a service menu, article,
landing page, free consultation flow, LINE registration path, event, course,
report, expert profile, or recurring content series.

SNS Planner may expose a customer-facing post creation UI to Professional
Studio or Growth Engine customers, including fortune tellers and other experts.
Even when the customer operates the UI directly, SNS Planner remains a
Growth Engine-driven content creation function. The business context is
supplied by Growth Engine.

SNS Planner owns:

- PostDraft
- simple MessageDraft for business-initiated contact or follow-up copy
- post text variants
- post status
- simple message draft status
- post schedule
- SNS-specific formatting
- hashtag and image prompt suggestions
- post templates
- draft state management
- content subject profile storage for post creation

SNS Planner must not own:

- customer master
- Communication Planner Conversation / Message / ConversationContext
- Communication Planner ReplyDraft / SafetyCheck / send workflow
- live conversation management
- Unified Inbox
- cross-person context mixing prevention
- payment state
- sales state
- reservation state
- public site source of truth
- appraisal reports
- sales judgement
- customer management
- lead management
- customer segmentation decisions
- campaign objective decisions
- campaign strategy
- target selection
- CTA selection
- funnel or lead-nurturing decisions
- lead nurturing workflow
- Business plan rules
- AI usage ledger
- revenue, ROI, LTV, or contract analysis

Growth Engine owns the business intent. SNS Planner transforms that intent and
content subject into SNS-ready posts. Existing MessageDraft support is limited
to simple contact or follow-up copy that does not require live conversation
history.

For Numeria Studio, SNS Planner creates writing assets used to promote and
support appraisal services, such as menu announcements, booking-page CTA text,
LINE broadcast copy, campaign notices, simple follow-up copy, and SNS post ideas.

For Velvet, SNS Planner may create simple business-initiated contact drafts and
SNS post ideas from reference-first Growth Engine intent. Conversation history,
reply generation, send confirmation, and safety checks belong to Communication
Planner.

## Allowed Cross-System APIs

SNS Planner must expose only the SNS Planner operations approved by the shared
API catalog.

| Operation | Caller | Responsibility |
| --- | --- | --- |
| `PostDraft.Generate` | Growth Engine | Generate draft variants from a Growth Engine request |
| `PostDraft.Rewrite` | Growth Engine | Rewrite an existing draft according to Growth Engine instructions |
| `PostDraft.Metadata` | Growth Engine, Platform Admin | Return PostDraft capability metadata |
| `PostTemplate.List` | Growth Engine | Return available post templates |
| `MessageDraft.Generate` | Growth Engine | Generate simple contact or follow-up message drafts from Growth Engine requirements |
| `MessageDraft.Rewrite` | Growth Engine | Rewrite an existing simple contact or follow-up message draft |
| `MessageDraft.Metadata` | Growth Engine, Platform Admin | Return MessageDraft capability metadata |

Professional Studio repositories, including Numeria Studio, must not call SNS
Planner directly. They must use Growth Engine as the integration path.
Platform Admin may monitor SNS Planner health, contracts, logs, and operational
snapshots, but it must not create or edit SNS post drafts or message drafts.

## Required Input

`PostDraft.Generate` must receive the business context from Growth Engine.

Minimum input:

| Field | Owner | Meaning |
| --- | --- | --- |
| `workspaceId` | AI Platform Core / Growth Engine reference | Workspace requesting the draft |
| `userId` | Growth Engine | Logged-in professional operating or requesting draft creation |
| `campaignId` | Growth Engine | Campaign or initiative context |
| `subjectId` | Growth Engine or local compatibility layer | Content subject reference |
| `subjectProfile` | Growth Engine or local compatibility layer | Content subject facts used for writing |
| `purpose` | Growth Engine | Why the post exists |
| `targetAudience` | Growth Engine | Who the post is for |
| `cta` | Growth Engine | Desired next action |
| `tone` | Growth Engine | Writing tone |
| `channel` | Growth Engine | SNS channel |
| `constraints` | Growth Engine | Length, required terms, forbidden terms, required topic |

SNS Planner may validate the request shape, but it must not replace or decide
the purpose, target audience, CTA, channel, tone, or constraints.

`MessageDraft.Generate` must also receive its business and communication context
from Growth Engine.

Minimum input:

| Field | Owner | Meaning |
| --- | --- | --- |
| `workspaceId` | Growth Engine reference | Workspace requesting the message draft |
| `userId` | Growth Engine | Logged-in professional requesting draft creation |
| `sourceApp` | Growth Engine | Caller app |
| `targetStudio` | Growth Engine | Professional app context, such as `numeria` or `velvet` |
| `channel` | Growth Engine | Delivery channel, such as LINE, DM, email, SMS, or other |
| `purpose` | Growth Engine | Communication purpose |
| `audienceSegment` | Growth Engine | Business-defined audience segment |
| `tone` | Growth Engine | Writing tone |
| `cta` | Growth Engine | Desired next action |
| `inputRef` | Growth Engine | Reference IDs only, such as customerId, reservationId, visitRef, campaignId, or followupId |

`inputRef` must remain reference-oriented. SNS Planner must not receive customer
personal details, payment details, sales amounts, full confidential notes,
Report bodies, fullMeetingTranscript, API keys, access tokens, or secret
prompts.

SNS Planner MessageDraft must not receive live conversation data,
ConversationContext, ReplyDraft, SafetyCheck, send workflow state, full message
bodies, or full conversation histories. These are Communication Planner
responsibilities.

For existing local data and JSON imports, `app_id` may remain as a compatibility
alias. New UI and future integration work should use `subjectId` /
`subject_id` to avoid limiting SNS Planner to app-only marketing.

## MVP Identity Scope

For MVP, SNS Planner must not introduce `professionalId` as a required
identifier.

SNS Planner data is scoped by:

- `workspaceId`: the professional's business workspace and the primary scope for
  `PostDraft`, `PostTemplate`, post history, and media assets.
- `userId`: the logged-in professional who creates, edits, imports, or publishes
  draft content.
- `ownerUserId`: the owner of the workspace when ownership checks are required.

If the shared contracts repository mentions `professionalId`, SNS Planner must
treat it as a future extension point for multi-brand, multi-professional, or
staff operations. It must not be required for MVP request payloads, storage, or
events.

## Output Contract

SNS Planner returns draft content only.

Recommended response shape:

```json
{
  "draftId": "...",
  "posts": [
    {
      "title": "...",
      "content": "...",
      "hashtags": [],
      "imagePrompt": "...",
      "reelScript": "...",
      "story": "...",
      "channel": "instagram",
      "status": "Draft"
    }
  ]
}
```

SNS Planner must not return sales conclusions, customer classifications, ROI
judgements, payment conclusions, reservation conclusions, public-site ownership
state, or next-business-action decisions.

For MessageDraft generation, SNS Planner returns only simple draft references
and writing outputs. Sending, reactions, booking conversion, visits, payment,
sales, and follow-up workflow state remain Growth Engine responsibilities.
Conversation-contextual replies, channel sending, and safety checks remain
Communication Planner responsibilities.

## Draft States

SNS Planner may manage only draft workflow states.

Approved states:

- `Draft`
- `Review`
- `Approved`
- `Published`

Any sales, customer, reservation, lead, or campaign status belongs to Growth
Engine.

## Events

SNS Planner may publish only SNS-prefixed draft state events.

| Event | Consumer | Purpose |
| --- | --- | --- |
| `sns.post_draft.created.v1` | Growth Engine | A post draft was created |
| `sns.post_draft.updated.v1` | Growth Engine | A post draft was updated |
| `sns.message_draft.created.v1` | Growth Engine | A simple message draft was created |
| `sns.message_draft.updated.v1` | Growth Engine | A simple message draft was updated |

Events are state-change notifications. Synchronous draft generation must remain
an API operation.

## Contract Change Rule

Before changing SNS Planner cross-system fields, operations, or events, check
the contracts repository first.

Use:

- `docs/contract-change-checklist.md`
- `docs/adoption-guide.md`
- `docs/decisions/`

Do not introduce product-specific cross-system terminology inside SNS Planner
without updating the shared contracts repository.
