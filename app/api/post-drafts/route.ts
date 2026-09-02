import { jsonResponse, optionsResponse, timestamp } from "../../api-metadata";

const aiPlatformCoreActivitiesUrl =
  "https://ai-platform-core-preview.illusionddt.chatgpt.site/api/activities";

type PostDraftRequest = {
  workspaceId?: unknown;
  userId?: unknown;
  sourceApp?: unknown;
  objective?: unknown;
  targetAudience?: unknown;
  topic?: unknown;
  contentType?: unknown;
  channel?: unknown;
  cta?: unknown;
  destinationUrl?: unknown;
};

type LogStatus = "success" | "warning" | "error" | "skipped";
type ErrorCode =
  | "BAD_REQUEST"
  | "CONTRACT_VIOLATION"
  | "UPSTREAM_TIMEOUT"
  | "UPSTREAM_UNAVAILABLE"
  | "UPSTREAM_BAD_RESPONSE"
  | "ENVIRONMENT_LIMITATION"
  | "INTERNAL_ERROR";

type ObservabilityContext = {
  traceId: string;
  correlationId: string;
  requestId: string;
  startTime: number;
};

const requiredFields: Array<keyof PostDraftRequest> = [
  "workspaceId",
  "userId",
  "sourceApp",
  "objective",
  "targetAudience",
  "topic",
  "contentType",
  "channel",
  "cta",
  "destinationUrl",
];

const supportedPostDraftMetadata = {
  appName: "sns-planner",
  operation: "PostDraft.Generate",
  endpoint: "POST /api/post-drafts",
  sourceApp: "growth-engine",
  targetApp: "sns-planner",
  statusVocabulary: ["success", "warning", "error", "skipped"],
  eventName: "sns.post_draft.created.v1",
  draftStatusValues: ["draft_created"],
  identityMode: "workspaceId+userId",
  professionalIdRequired: false,
  sourceOfTruth: {
    postDraft: true,
    messageDraft: true,
    customer: false,
    reservation: false,
    payment: false,
    sales: false,
    aiActivity: false,
  },
  requiredFields,
  supportedContentTypes: [
    "instagram_post",
    "instagram_reel",
    "instagram_story",
    "x_post",
    "threads_post",
    "facebook_post",
    "linkedin_post",
    "other",
  ],
  supportedChannels: [
    "instagram",
    "x",
    "threads",
    "facebook",
    "linkedin",
    "other",
  ],
  sampleRequest: {
    workspaceId: "ws_test_001",
    userId: "user_test_owner_001",
    sourceApp: "growth-engine",
    objective: "increase_reservations",
    targetAudience: "repeat_customers",
    topic: "今月の数秘メッセージ",
    contentType: "instagram_post",
    channel: "instagram",
    cta: "予約ページを見る",
    destinationUrl:
      "https://growth-engine-api-preview.illusionddt.chatgpt.site/test-booking",
  },
  aiPlatformCoreActivity: {
    targetApp: "ai-platform-core",
    endpoint: "POST /api/activities",
    sourceApp: "sns-planner",
    activityType: "sns.post_draft.created",
    capability: "sns.post.generate",
    inputMode: "reference_ids_only",
  },
  boundary:
    "Growth Engine owns objective, target audience, CTA, destination URL, campaign, customer, reservation, payment, and sales decisions. SNS Planner owns only PostDraft and MessageDraft writing outputs.",
};

function isRecord(value: unknown): value is PostDraftRequest {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createDraftId() {
  return `draft_${Date.now().toString(36)}`;
}

function createId(prefix: "trace" | "corr" | "req" | "evt") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function createObservabilityContext(request: Request): ObservabilityContext {
  return {
    traceId: request.headers.get("x-trace-id") || createId("trace"),
    correlationId:
      request.headers.get("x-correlation-id") || createId("corr"),
    requestId: createId("req"),
    startTime: Date.now(),
  };
}

function observabilityHeaders(context: ObservabilityContext) {
  return {
    "X-Trace-Id": context.traceId,
    "X-Correlation-Id": context.correlationId,
    "X-Request-Id": context.requestId,
  };
}

function sanitizeSourceApp(value: unknown) {
  return hasText(value) ? value : "growth-engine";
}

function logObservability(entry: Record<string, unknown>) {
  console.info(JSON.stringify(entry));
}

function logInboundApi(
  context: ObservabilityContext,
  payload: PostDraftRequest | null,
  status: LogStatus,
  statusCode: number,
  errorCode: ErrorCode | null,
) {
  logObservability({
    logType: "api.inbound",
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
    operation: "PostDraft.Generate",
    endpoint: "POST /api/post-drafts",
    sourceApp: sanitizeSourceApp(payload?.sourceApp),
    targetApp: "sns-planner",
    workspaceId: hasText(payload?.workspaceId) ? payload?.workspaceId : null,
    userId: hasText(payload?.userId) ? payload?.userId : null,
    status,
    statusCode,
    errorCode,
    durationMs: Date.now() - context.startTime,
    occurredAt: timestamp(),
  });
}

function logOutboundApi(
  context: ObservabilityContext,
  payload: PostDraftRequest,
  status: LogStatus,
  statusCode: number | null,
  errorCode: ErrorCode | null,
  durationMs: number,
) {
  logObservability({
    logType: "api.outbound",
    traceId: context.traceId,
    correlationId: context.correlationId,
    operation: "Activity.Create",
    endpoint: "POST /api/activities",
    sourceApp: "sns-planner",
    targetApp: "ai-platform-core",
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    status,
    statusCode,
    errorCode,
    durationMs,
    occurredAt: timestamp(),
  });
}

function logPostDraftCreatedEvent(
  context: ObservabilityContext,
  payload: PostDraftRequest,
  draftId: string,
) {
  logObservability({
    logType: "event.published",
    traceId: context.traceId,
    correlationId: context.correlationId,
    eventId: createId("evt"),
    eventName: "sns.post_draft.created.v1",
    entityType: "postDraft",
    entityId: draftId,
    sourceApp: "sns-planner",
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    status: "success",
    occurredAt: timestamp(),
  });
}

function getAiActivityErrorCode(statusCode: number): ErrorCode | null {
  if (statusCode >= 200 && statusCode < 300) {
    return null;
  }

  if (statusCode === 400) {
    return "BAD_REQUEST";
  }

  if (statusCode === 422) {
    return "CONTRACT_VIOLATION";
  }

  if (statusCode === 408 || statusCode === 504) {
    return "UPSTREAM_TIMEOUT";
  }

  if (statusCode === 502 || statusCode === 503) {
    return "UPSTREAM_UNAVAILABLE";
  }

  if (statusCode === 522) {
    return "ENVIRONMENT_LIMITATION";
  }

  return "UPSTREAM_BAD_RESPONSE";
}

function createAiActivityError(
  errorCode: ErrorCode,
  context: ObservabilityContext,
) {
  const isEnvironmentLimitation = errorCode === "ENVIRONMENT_LIMITATION";

  return {
    code: errorCode,
    message: isEnvironmentLimitation
      ? "AI Platform Core returned 522 due to Sites/Preview runtime environment limitation."
      : "AI activity endpoint returned an unexpected status.",
    retryable:
      errorCode === "UPSTREAM_TIMEOUT" ||
      errorCode === "UPSTREAM_UNAVAILABLE" ||
      errorCode === "UPSTREAM_BAD_RESPONSE" ||
      isEnvironmentLimitation,
    sourceApp: "sns-planner",
    targetApp: "ai-platform-core",
    traceId: context.traceId,
    correlationId: context.correlationId,
  };
}

async function createAiActivity(
  payload: PostDraftRequest,
  draftId: string,
  context: ObservabilityContext,
) {
  const activityPayload = {
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    sourceApp: "sns-planner",
    activityType: "sns.post_draft.created",
    capability: "sns.post.generate",
    inputRef: {
      draftId,
      channel: payload.channel,
    },
  };

  const response = await fetch(aiPlatformCoreActivitiesUrl, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-trace-id": context.traceId,
      "x-correlation-id": context.correlationId,
      "x-source-app": "sns-planner",
    },
    body: JSON.stringify(activityPayload),
  });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return {
    statusCode: response.status,
    body,
  };
}

export async function POST(request: Request) {
  const context = createObservabilityContext(request);
  const responseHeaders = observabilityHeaders(context);
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    logInboundApi(context, null, "error", 200, "BAD_REQUEST");
    return jsonResponse({
      status: "error",
      error: {
        code: "BAD_REQUEST",
        message: "Request body must be valid JSON.",
        retryable: false,
        sourceApp: "growth-engine",
        targetApp: "sns-planner",
        traceId: context.traceId,
        correlationId: context.correlationId,
      },
      traceId: context.traceId,
      correlationId: context.correlationId,
      requestId: context.requestId,
    }, { headers: responseHeaders });
  }

  if (!isRecord(payload)) {
    logInboundApi(context, null, "error", 200, "BAD_REQUEST");
    return jsonResponse({
      status: "error",
      error: {
        code: "BAD_REQUEST",
        message: "Request body must be a JSON object.",
        retryable: false,
        sourceApp: "growth-engine",
        targetApp: "sns-planner",
        traceId: context.traceId,
        correlationId: context.correlationId,
      },
      traceId: context.traceId,
      correlationId: context.correlationId,
      requestId: context.requestId,
    }, { headers: responseHeaders });
  }

  const missingFields = requiredFields.filter(
    (field) => !hasText(payload[field]),
  );

  if (missingFields.length > 0) {
    logInboundApi(context, payload, "error", 200, "CONTRACT_VIOLATION");
    return jsonResponse({
      status: "error",
      error: {
        code: "CONTRACT_VIOLATION",
        message: "Required contract fields are missing.",
        retryable: false,
        sourceApp: sanitizeSourceApp(payload.sourceApp),
        targetApp: "sns-planner",
        traceId: context.traceId,
        correlationId: context.correlationId,
        missingFields,
      },
      traceId: context.traceId,
      correlationId: context.correlationId,
      requestId: context.requestId,
    }, { headers: responseHeaders });
  }

  const draftId = createDraftId();
  const baseResponse = {
    draftId,
    workspaceId: payload.workspaceId,
    draftStatus: "draft_created",
    channel: payload.channel,
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
    eventName: "sns.post_draft.created.v1",
  };

  try {
    const outboundStart = Date.now();
    const activity = await createAiActivity(payload, draftId, context);
    const outboundStatus =
      activity.statusCode >= 200 && activity.statusCode < 300
        ? "success"
        : "warning";
    const outboundErrorCode = getAiActivityErrorCode(activity.statusCode);

    logOutboundApi(
      context,
      payload,
      outboundStatus,
      activity.statusCode,
      outboundErrorCode,
      Date.now() - outboundStart,
    );
    logPostDraftCreatedEvent(context, payload, draftId);
    logInboundApi(context, payload, outboundStatus, 200, outboundErrorCode);

    return jsonResponse({
      ...baseResponse,
      status: outboundStatus,
      aiActivityStatusCode: activity.statusCode,
      recordedActivity: activity.body,
      ...(outboundErrorCode
        ? {
            error: createAiActivityError(outboundErrorCode, context),
          }
        : {}),
    }, { headers: responseHeaders });
  } catch (error) {
    const errorCode: ErrorCode =
      error instanceof TypeError ? "UPSTREAM_UNAVAILABLE" : "INTERNAL_ERROR";
    logOutboundApi(context, payload, "error", null, errorCode, 0);
    logPostDraftCreatedEvent(context, payload, draftId);
    logInboundApi(context, payload, "warning", 200, errorCode);

    return jsonResponse({
      ...baseResponse,
      status: "warning",
      aiActivityStatusCode: null,
      recordedActivity: null,
      error: {
        code: errorCode,
        message: "AI activity request failed after post draft creation.",
        retryable: errorCode === "UPSTREAM_UNAVAILABLE",
        sourceApp: "sns-planner",
        targetApp: "ai-platform-core",
        traceId: context.traceId,
        correlationId: context.correlationId,
      },
    }, { headers: responseHeaders });
  }
}

export function GET() {
  return jsonResponse({
    ...supportedPostDraftMetadata,
    timestamp: timestamp(),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
