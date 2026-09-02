import { jsonResponse, optionsResponse, timestamp } from "../../api-metadata";

const aiPlatformCoreActivitiesUrl =
  "https://ai-platform-core-preview.illusionddt.chatgpt.site/api/activities";

type MessageDraftRequest = {
  workspaceId?: unknown;
  userId?: unknown;
  sourceApp?: unknown;
  targetStudio?: unknown;
  channel?: unknown;
  purpose?: unknown;
  audienceSegment?: unknown;
  tone?: unknown;
  cta?: unknown;
  inputRef?: unknown;
  traceId?: unknown;
  correlationId?: unknown;
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
  traceIdFromHeader: boolean;
  correlationIdFromHeader: boolean;
};

const requiredFields: Array<keyof MessageDraftRequest> = [
  "workspaceId",
  "userId",
  "sourceApp",
  "targetStudio",
  "channel",
  "purpose",
  "audienceSegment",
  "tone",
  "cta",
  "inputRef",
];

const prohibitedFields = new Set([
  "customer",
  "customerMaster",
  "customerMasterRecords",
  "customerProfile",
  "customerPersonalInformation",
  "customerName",
  "fullName",
  "name",
  "email",
  "phone",
  "phoneNumber",
  "birthday",
  "birthDate",
  "dateOfBirth",
  "payment",
  "paymentStatus",
  "sales",
  "salesAmount",
  "stripeSecret",
  "stripe_secret",
  "stripeData",
  "secret",
  "secretPrompt",
  "accessToken",
  "apiKey",
  "fullMeetingTranscript",
  "fullReport",
  "reportBody",
  "fullReportBody",
  "fullReportBodies",
  "confidentialMemo",
  "memoFullText",
  "fullProfessionalNotes",
  "fullProfessionalMemory",
  "fullProfessionalNoteBody",
  "fullProfessionalMemoryBody",
  "liveConversation",
  "liveConversationContext",
  "unifiedInbox",
  "conversation",
  "conversationId",
  "conversationContext",
  "conversationContextBody",
  "fullConversationContext",
  "fullConversationHistory",
  "fullConversationHistories",
  "messageBody",
  "fullMessageBody",
  "replyDraft",
  "replyDraftId",
  "safetyCheck",
  "safetyCheckId",
  "sendWorkflow",
  "channelSend",
  "dmSend",
  "lineSend",
  "actualMessageSend",
  "crossPersonContext",
  "otherPersonContext",
  "velvetCustomerMaster",
  "paymentRecord",
  "paymentRecords",
  "salesRecord",
  "salesRecords",
]);

const allowedInputRefFields = new Set([
  "customerId",
  "reservationId",
  "visitScheduleId",
  "visitId",
  "noteId",
  "summaryRef",
  "nextActionRef",
  "followupId",
  "campaignId",
  "messageDraftId",
]);

const supportedMessageDraftMetadata = {
  appName: "sns-planner",
  operation: "MessageDraft.Generate",
  contractStatus: "stable",
  operations: [
    "MessageDraft.Generate",
    "MessageDraft.Rewrite",
    "MessageDraft.Metadata",
  ],
  endpoint: "POST /api/message-drafts",
  sourceApp: "growth-engine",
  targetApp: "sns-planner",
  statusVocabulary: ["success", "warning", "error", "skipped"],
  eventName: "sns.message_draft.created.v1",
  messageDraftStatusValues: ["draft_created"],
  identityMode: "workspaceId+userId",
  professionalIdRequired: false,
  sourceOfTruth: {
    messageDraft: true,
    postDraft: true,
    communicationReplyDraft: false,
    communicationSafetyCheck: false,
    communicationConversation: false,
    communicationConversationContext: false,
    customer: false,
    reservation: false,
    payment: false,
    sales: false,
    aiActivity: false,
    velvetVisit: false,
    velvetMemory: false,
    velvetNote: false,
    velvetNextAction: false,
  },
  requiredFields,
  messageDraftScope: {
    role: "simple_business_initiated_contact_or_followup_draft",
    allowedUseCases: [
      "growth_engine_simple_followup_copy",
      "campaign_originated_simple_contact_copy",
      "message_copy_without_live_conversation_history",
    ],
    notFor: [
      "live_conversation",
      "unified_inbox",
      "conversation_context",
      "reply_draft",
      "safety_check",
      "channel_send",
      "cross_person_context_check",
    ],
    delegatedOwner: {
      liveConversation: "communication-planner",
      unifiedInbox: "communication-planner",
      conversationContext: "communication-planner",
      replyDraft: "communication-planner",
      safetyCheck: "communication-planner",
      channelSend: "communication-planner",
      crossPersonContextMixingPrevention: "communication-planner",
    },
  },
  supportedTargetStudios: ["numeria", "velvet"],
  supportedChannels: ["line", "instagram_dm", "email", "sms", "other"],
  supportedPurposes: [
    "reservation_reminder",
    "followup",
    "follow_up",
    "repeat_visit",
    "campaign_notice",
    "thank_you",
    "inactive_customer",
  ],
  supportedAudienceSegments: [
    "new_lead",
    "first_time_customer",
    "repeat_customer",
    "repeat_candidate",
    "inactive_customer",
    "high_value_customer",
  ],
  supportedTones: [
    "polite",
    "friendly",
    "concise",
    "warm",
    "professional",
    "casual",
    "premium",
    "gentle",
  ],
  supportedCtas: [
    "booking_page",
    "book_next_visit",
    "reply_request",
    "visit_request",
    "consultation_request",
  ],
  sampleRequest: {
    workspaceId: "ws_test_001",
    userId: "user_test_owner_001",
    sourceApp: "growth-engine",
    targetStudio: "numeria",
    channel: "line",
    purpose: "followup",
    audienceSegment: "repeat_customer",
    tone: "warm",
    cta: "booking_page",
    inputRef: {
      customerId: "cus_test_001",
      reservationId: "res_test_001",
      campaignId: "camp_test_001",
      followupId: "follow_test_001",
    },
  },
  velvetContractAlignment: {
    supportedAsProfessionalApp: true,
    payloadMode: "reference_first",
    acceptedReferences: [
      "customerId",
      "reservationId",
      "visitScheduleId",
      "visitId",
      "noteId",
      "summaryRef",
      "nextActionRef",
      "followupId",
      "campaignId",
    ],
    relatedEvents: [
      "velvet.visit.started.v1",
      "velvet.visit.completed.v1",
      "velvet.memory.updated.v1",
      "velvet.note.created.v1",
      "velvet.next_action.created.v1",
    ],
    relatedApiOperations: [
      "VelvetVisit.Start",
      "VelvetVisit.Complete",
      "VelvetMemory.Get",
      "VelvetMemory.Update",
      "VelvetNote.Create",
      "VelvetTimeline.List",
      "VelvetNextAction.Create",
      "VelvetHandoff.Start",
    ],
    ownership: {
      businessDecision: "growth-engine",
      customerMaster: "growth-engine",
      payment: "growth-engine",
      sales: "growth-engine",
      messageDraft: "sns-planner",
      velvetVisit: "velvet",
      velvetMemory: "velvet",
      velvetNote: "velvet",
      velvetNextAction: "velvet",
    },
    ownsVelvetVisit: false,
    ownsVelvetMemory: false,
    ownsVelvetNote: false,
    ownsVelvetNextAction: false,
  },
  prohibitedPayloadFields: Array.from(prohibitedFields),
  allowedInputRefFields: Array.from(allowedInputRefFields),
  aiPlatformCoreActivity: {
    targetApp: "ai-platform-core",
    endpoint: "POST /api/activities",
    sourceApp: "sns-planner",
    activityType: "sns.message_draft.created",
    capability: "sns.message.generate",
    inputMode: "reference_ids_only",
  },
};

function textValue(value: unknown, fallback = "") {
  return hasText(value) ? value.trim() : fallback;
}

function labelFor(value: unknown, map: Record<string, string>) {
  const key = hasText(value) ? value.trim() : "";
  return map[key] ?? key;
}

function buildMessageDraftText(
  payload: MessageDraftRequest,
  label: string,
  styleInstruction: string,
) {
  const studioLabel = labelFor(payload.targetStudio, {
    numeria: "鑑定サービス",
    velvet: "来店サービス",
  });
  const purposeLabel = labelFor(payload.purpose, {
    reservation_reminder: "予約確認",
    followup: "フォロー",
    follow_up: "フォロー",
    repeat_visit: "次回案内",
    campaign_notice: "お知らせ",
    thank_you: "お礼",
    inactive_customer: "再連絡",
  });
  const channel = textValue(payload.channel, "line");
  const cta = labelFor(payload.cta, {
    booking_page: "予約ページを見る",
    book_next_visit: "次回予約へ進む",
    reply_request: "返信する",
    visit_request: "次回の予定を確認する",
    consultation_request: "相談する",
  });

  const channelOpeners: Record<string, string> = {
    line: "こんにちは。短く確認しやすい形でご案内します。",
    instagram_dm: "こんにちは。DMで失礼します。",
    email: `件名：${studioLabel}からの${purposeLabel}のご案内\n\nいつもありがとうございます。`,
    sms: "ご案内です。",
    other: "ご案内します。",
  };
  const closer =
    channel === "sms"
      ? `${cta}。`
      : `よろしければ、${cta}からご確認ください。`;

  return `${channelOpeners[channel] ?? channelOpeners.other}\n\n${studioLabel}の${purposeLabel}について、必要な内容だけ整理しました。\n${styleInstruction}\n\n${closer}\n\n${label}`;
}

function buildMessageVariants(payload: MessageDraftRequest) {
  const definitions = [
    ["var_001", "短め", "要点を短くまとめています。"],
    ["var_002", "丁寧", "落ち着いた丁寧な文体にしています。"],
    ["var_003", "親しみやすい", "自然に返信しやすい文体にしています。"],
    ["var_004", "強めのCTA", "次の行動が分かりやすい文体にしています。"],
    ["var_005", "やわらかいCTA", "押しつけず自然に促す文体にしています。"],
  ] as const;

  return definitions.map(([variantId, label, instruction]) => ({
    variantId,
    label,
    text: buildMessageDraftText(payload, label, instruction),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function createId(prefix: "trace" | "corr" | "req" | "evt" | "msg_draft") {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function createObservabilityContext(request: Request): ObservabilityContext {
  const traceId = request.headers.get("x-trace-id");
  const correlationId = request.headers.get("x-correlation-id");

  return {
    traceId: traceId || createId("trace"),
    correlationId: correlationId || createId("corr"),
    requestId: createId("req"),
    startTime: Date.now(),
    traceIdFromHeader: Boolean(traceId),
    correlationIdFromHeader: Boolean(correlationId),
  };
}

function applyPayloadObservabilityContext(
  context: ObservabilityContext,
  payload: MessageDraftRequest,
) {
  if (!context.traceIdFromHeader && hasText(payload.traceId)) {
    context.traceId = payload.traceId;
  }
  if (!context.correlationIdFromHeader && hasText(payload.correlationId)) {
    context.correlationId = payload.correlationId;
  }
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

function findProhibitedFields(value: unknown, path = ""): string[] {
  if (!isRecord(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, childValue]) => {
    const currentPath = path ? `${path}.${key}` : key;
    const nested = isRecord(childValue)
      ? findProhibitedFields(childValue, currentPath)
      : [];

    return prohibitedFields.has(key) ? [currentPath, ...nested] : nested;
  });
}

function sanitizeInputRef(inputRef: unknown) {
  if (!isRecord(inputRef)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(inputRef).filter(([key, value]) => {
      return (
        allowedInputRefFields.has(key) &&
        (typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null)
      );
    }),
  );
}

function logInboundApi(
  context: ObservabilityContext,
  payload: MessageDraftRequest | null,
  status: LogStatus,
  statusCode: number,
  errorCode: ErrorCode | null,
) {
  logObservability({
    logType: "api.inbound",
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
    operation: "MessageDraft.Generate",
    endpoint: "POST /api/message-drafts",
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
  payload: MessageDraftRequest,
  status: LogStatus,
  statusCode: number | null,
  errorCode: ErrorCode | null,
  durationMs: number,
) {
  logObservability({
    logType: "api.outbound",
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
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

function logMessageDraftCreatedEvent(
  context: ObservabilityContext,
  payload: MessageDraftRequest,
  messageDraftId: string,
) {
  logObservability({
    logType: "event.published",
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
    eventId: createId("evt"),
    eventName: "sns.message_draft.created.v1",
    entityType: "messageDraft",
    entityId: messageDraftId,
    sourceApp: "sns-planner",
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    status: "success",
    occurredAt: timestamp(),
  });
}

function getAiActivityErrorCode(statusCode: number): ErrorCode | null {
  if (statusCode >= 200 && statusCode < 300) return null;
  if (statusCode === 400) return "BAD_REQUEST";
  if (statusCode === 422) return "CONTRACT_VIOLATION";
  if (statusCode === 408 || statusCode === 504) return "UPSTREAM_TIMEOUT";
  if (statusCode === 502 || statusCode === 503) return "UPSTREAM_UNAVAILABLE";
  if (statusCode === 522) return "ENVIRONMENT_LIMITATION";
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

function createErrorResponse(
  context: ObservabilityContext,
  code: ErrorCode,
  message: string,
  payload: MessageDraftRequest | null,
  extra: Record<string, unknown> = {},
) {
  logInboundApi(context, payload, "error", 200, code);

  return jsonResponse({
    status: "error",
    error: {
      code,
      message,
      retryable: false,
      sourceApp: sanitizeSourceApp(payload?.sourceApp),
      targetApp: "sns-planner",
      traceId: context.traceId,
      correlationId: context.correlationId,
      ...extra,
    },
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
  }, { headers: observabilityHeaders(context) });
}

async function createAiActivity(
  payload: MessageDraftRequest,
  messageDraftId: string,
  context: ObservabilityContext,
) {
  const activityPayload = {
    workspaceId: payload.workspaceId,
    userId: payload.userId,
    sourceApp: "sns-planner",
    activityType: "sns.message_draft.created",
    capability: "sns.message.generate",
    inputRef: {
      messageDraftId,
      channel: payload.channel,
      purpose: payload.purpose,
      targetStudio: payload.targetStudio,
      ...sanitizeInputRef(payload.inputRef),
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
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return createErrorResponse(
      context,
      "BAD_REQUEST",
      "Request body must be valid JSON.",
      null,
    );
  }

  if (!isRecord(payload)) {
    return createErrorResponse(
      context,
      "BAD_REQUEST",
      "Request body must be a JSON object.",
      null,
    );
  }

  applyPayloadObservabilityContext(context, payload);

  const missingFields = requiredFields.filter((field) => {
    if (field === "inputRef") {
      return !isRecord(payload[field]);
    }

    return !hasText(payload[field]);
  });

  if (missingFields.length > 0) {
    return createErrorResponse(
      context,
      "CONTRACT_VIOLATION",
      "Required contract fields are missing.",
      payload,
      { missingFields },
    );
  }

  const prohibited = findProhibitedFields(payload);

  if (prohibited.length > 0) {
    return createErrorResponse(
      context,
      "CONTRACT_VIOLATION",
      "Payload includes fields that SNS Planner must not receive or store.",
      payload,
      { prohibitedFields: prohibited },
    );
  }

  const messageDraftId = createId("msg_draft");
  const variants = buildMessageVariants(payload);
  const generatedText = variants[0]?.text ?? "";
  const baseResponse = {
    messageDraftId,
    workspaceId: payload.workspaceId,
    messageDraftStatus: "draft_created",
    channel: payload.channel,
    purpose: payload.purpose,
    targetStudio: payload.targetStudio,
    generatedText,
    variants,
    traceId: context.traceId,
    correlationId: context.correlationId,
    requestId: context.requestId,
    eventName: "sns.message_draft.created.v1",
  };

  try {
    const outboundStart = Date.now();
    const activity = await createAiActivity(payload, messageDraftId, context);
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
    logMessageDraftCreatedEvent(context, payload, messageDraftId);
    logInboundApi(context, payload, outboundStatus, 200, outboundErrorCode);

    return jsonResponse({
      ...baseResponse,
      status: outboundStatus,
      aiActivityStatusCode: activity.statusCode,
      recordedActivity: activity.body,
      ...(outboundErrorCode
        ? { error: createAiActivityError(outboundErrorCode, context) }
        : {}),
    }, { headers: observabilityHeaders(context) });
  } catch (error) {
    const errorCode: ErrorCode =
      error instanceof TypeError ? "UPSTREAM_UNAVAILABLE" : "INTERNAL_ERROR";

    logOutboundApi(context, payload, "error", null, errorCode, 0);
    logMessageDraftCreatedEvent(context, payload, messageDraftId);
    logInboundApi(context, payload, "warning", 200, errorCode);

    return jsonResponse({
      ...baseResponse,
      status: "warning",
      aiActivityStatusCode: null,
      recordedActivity: null,
      error: {
        code: errorCode,
        message: "AI activity request failed after message draft creation.",
        retryable: errorCode === "UPSTREAM_UNAVAILABLE",
        sourceApp: "sns-planner",
        targetApp: "ai-platform-core",
        traceId: context.traceId,
        correlationId: context.correlationId,
      },
    }, { headers: observabilityHeaders(context) });
  }
}

export function GET() {
  return jsonResponse({
    ...supportedMessageDraftMetadata,
    timestamp: timestamp(),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
