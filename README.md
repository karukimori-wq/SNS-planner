# SNS Planner

SNS Planner is a post-draft creation tool for the Professional Platform.

It focuses on creating SNS post drafts:

- post body
- hashtags
- image ideas
- reel ideas
- story ideas
- SNS-specific formatting
- post draft management
- local media management
- JSON bulk import

SNS Planner does not own customer, reservation, payment, sales, or funnel decisions.
Those responsibilities belong to Growth Engine or other platform apps.

## Current Published App

https://sns-planner.illusionddt.chatgpt.site

## Main Routes

- `GET /health`
- `GET /version`
- `GET /contracts/status`
- `POST /api/post-drafts`
- `POST /api/message-drafts`
- `GET /api/post-drafts/metadata`
- `GET /api/message-drafts/metadata`

`POST /api/message-drafts` remains for platform compatibility, but the main UI is focused on SNS post creation.
One-to-one communication workflows are handled by Communication Planner.

## Local Development

Requirements:

- Node.js `>=22.13.0`

Commands:

```bash
npm ci
npm run dev
npm test
```

## Validation

The current app is validated with:

```bash
npm test
```

This runs the production build and API/rendered HTML tests.
