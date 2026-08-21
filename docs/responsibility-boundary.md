# SNS Planner Responsibility Boundary

## Purpose

SNS Planner is the content-production surface for public/social distribution. It turns an objective, target, topic, channel, CTA and related inputs into SNS-ready draft content.

## SNS Planner owns

- PostDraft
- SNS-specific body/formatting
- hashtags
- image/reel/story ideas
- post-draft editing state
- local media/material organization used for post creation
- bulk draft import/export needed by the planner UI

## SNS Planner does not own

- Customer master
- Lead lifecycle source of truth
- Reservation
- Payment / Revenue
- campaign/funnel business decisions
- Conversation / Message
- ConversationContext
- Promise / communication NextAction
- ReplyDraft / SafetyCheck / send workflow

Business decisions belong to Growth Engine. One-to-one communication belongs to Communication Planner.

## Compatibility endpoint

`POST /api/message-drafts` may remain temporarily as a platform-compatibility surface while callers migrate. It must not grow into a one-to-one communication product surface. New reply-generation, conversation-context, safety-check or send features must be implemented in Communication Planner instead.

## UI rule

The primary SNS Planner navigation must focus on post creation, drafts, schedule/material workflows and SNS optimization. Individual-message creation must not be presented as a first-class SNS Planner workflow.
