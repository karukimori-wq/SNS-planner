import assert from "node:assert/strict";
import test from "node:test";

const developmentPreviewMeta =
  /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;
const allowMethods = "GET, POST, OPTIONS";

test("renders development preview metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), developmentPreviewMeta);
});

async function fetchFromBuiltWorker(path, init = {}) {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${path}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "application/json" },
      ...init,
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("serves API connection test endpoints", async () => {
  const health = await fetchFromBuiltWorker("/health");
  assert.equal(health.status, 200);
  assert.match(
    health.headers.get("content-type") ?? "",
    /^application\/json\b/i,
  );
  assert.equal(health.headers.get("access-control-allow-origin"), "*");
  assert.equal(
    health.headers.get("access-control-allow-methods"),
    allowMethods,
  );
  assert.equal(
    health.headers.get("access-control-allow-headers"),
    "Content-Type, X-Trace-Id, X-Correlation-Id, X-Source-App",
  );
  const healthBody = await health.json();
  assert.equal(healthBody.appName, "sns-planner");
  assert.equal(healthBody.status, "ok");
  assert.match(healthBody.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  const version = await fetchFromBuiltWorker("/version");
  assert.equal(version.status, 200);
  const versionBody = await version.json();
  assert.deepEqual(
    {
      appName: versionBody.appName,
      appVersion: versionBody.appVersion,
      contractVersion: versionBody.contractVersion,
    },
    {
      appName: "sns-planner",
      appVersion: "0.1.0",
      contractVersion: "0.1.0",
    },
  );
  assert.match(versionBody.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  const contractsStatus = await fetchFromBuiltWorker("/contracts/status");
  assert.equal(contractsStatus.status, 200);
  const contractsStatusBody = await contractsStatus.json();
  assert.deepEqual(
    {
      appName: contractsStatusBody.appName,
      status: contractsStatusBody.status,
      contractVersion: contractsStatusBody.contractVersion,
      identityMode: contractsStatusBody.identityMode,
      professionalIdRequired: contractsStatusBody.professionalIdRequired,
      usesLegacyEventNames: contractsStatusBody.usesLegacyEventNames,
      usesReportTerminology: contractsStatusBody.usesReportTerminology,
      canonicalOwnershipChecked:
        contractsStatusBody.canonicalOwnershipChecked,
      issues: contractsStatusBody.issues,
    },
    {
      appName: "sns-planner",
      status: "success",
      contractVersion: "0.1.0",
      identityMode: "workspaceId+userId",
      professionalIdRequired: false,
      usesLegacyEventNames: false,
      usesReportTerminology: true,
      canonicalOwnershipChecked: true,
      issues: [],
    },
  );
  assert.equal(contractsStatusBody.canonicalDraftOwnership.postDraft, true);
  assert.equal(contractsStatusBody.canonicalDraftOwnership.messageDraft, true);
  assert.equal(contractsStatusBody.canonicalDraftOwnership.customerMaster, false);
  assert.equal(
    contractsStatusBody.canonicalDraftOwnership.paymentSourceOfTruth,
    false,
  );
  assert.ok(
    contractsStatusBody.supportedOperations.includes("MessageDraft.Generate"),
  );
  assert.ok(
    contractsStatusBody.supportedOperations.includes("MessageDraft.Metadata"),
  );
  assert.ok(
    contractsStatusBody.supportedOperations.includes("MessageDraft.Rewrite"),
  );
  assert.ok(
    contractsStatusBody.supportedEndpoints.includes(
      "POST /api/message-drafts",
    ),
  );
  assert.ok(
    contractsStatusBody.supportedEvents.includes(
      "sns.message_draft.created.v1",
    ),
  );
  assert.ok(
    contractsStatusBody.supportedEndpoints.includes(
      "GET /api/message-drafts/metadata",
    ),
  );
  assert.equal(contractsStatusBody.observability.traceHeaders, true);
  assert.equal(
    contractsStatusBody.observability.environmentLimitationCode,
    "ENVIRONMENT_LIMITATION",
  );
  assert.ok(
    contractsStatusBody.prohibitedPayloadFields.includes("paymentStatus"),
  );
  assert.match(contractsStatusBody.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  const postDraftsMetadata = await fetchFromBuiltWorker("/api/post-drafts");
  assert.equal(postDraftsMetadata.status, 200);
  assert.equal(
    postDraftsMetadata.headers.get("access-control-allow-origin"),
    "*",
  );
  const postDraftsMetadataBody = await postDraftsMetadata.json();
  assert.deepEqual(
    {
      appName: postDraftsMetadataBody.appName,
      operation: postDraftsMetadataBody.operation,
      endpoint: postDraftsMetadataBody.endpoint,
      sourceApp: postDraftsMetadataBody.sourceApp,
      targetApp: postDraftsMetadataBody.targetApp,
      eventName: postDraftsMetadataBody.eventName,
      identityMode: postDraftsMetadataBody.identityMode,
      professionalIdRequired: postDraftsMetadataBody.professionalIdRequired,
      postDraftSourceOfTruth:
        postDraftsMetadataBody.sourceOfTruth.postDraft,
      paymentSourceOfTruth:
        postDraftsMetadataBody.sourceOfTruth.payment,
      aiInputMode: postDraftsMetadataBody.aiPlatformCoreActivity.inputMode,
    },
    {
      appName: "sns-planner",
      operation: "PostDraft.Generate",
      endpoint: "POST /api/post-drafts",
      sourceApp: "growth-engine",
      targetApp: "sns-planner",
      eventName: "sns.post_draft.created.v1",
      identityMode: "workspaceId+userId",
      professionalIdRequired: false,
      postDraftSourceOfTruth: true,
      paymentSourceOfTruth: false,
      aiInputMode: "reference_ids_only",
    },
  );
  assert.ok(postDraftsMetadataBody.requiredFields.includes("workspaceId"));
  assert.ok(
    postDraftsMetadataBody.supportedContentTypes.includes("instagram_post"),
  );
  assert.ok(postDraftsMetadataBody.supportedChannels.includes("instagram"));
  assert.equal(
    postDraftsMetadataBody.sampleRequest.workspaceId,
    "ws_test_001",
  );
  assert.match(postDraftsMetadataBody.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  const postDraftsMetadataV2 = await fetchFromBuiltWorker(
    "/api/post-drafts/metadata",
  );
  assert.equal(postDraftsMetadataV2.status, 200);
  const postDraftsMetadataV2Body = await postDraftsMetadataV2.json();
  assert.equal(postDraftsMetadataV2Body.supported, true);
  assert.equal(postDraftsMetadataV2Body.draftType, "PostDraft");
  assert.equal(postDraftsMetadataV2Body.status, "success");
  assert.ok(
    postDraftsMetadataV2Body.events.includes("sns.post_draft.created.v1"),
  );

  const messageDraftsMetadata = await fetchFromBuiltWorker(
    "/api/message-drafts",
  );
  assert.equal(messageDraftsMetadata.status, 200);
  assert.equal(
    messageDraftsMetadata.headers.get("access-control-allow-origin"),
    "*",
  );
  const messageDraftsMetadataBody = await messageDraftsMetadata.json();
  assert.deepEqual(
    {
      appName: messageDraftsMetadataBody.appName,
      operation: messageDraftsMetadataBody.operation,
      endpoint: messageDraftsMetadataBody.endpoint,
      sourceApp: messageDraftsMetadataBody.sourceApp,
      targetApp: messageDraftsMetadataBody.targetApp,
      eventName: messageDraftsMetadataBody.eventName,
      identityMode: messageDraftsMetadataBody.identityMode,
      professionalIdRequired:
        messageDraftsMetadataBody.professionalIdRequired,
      messageDraftSourceOfTruth:
        messageDraftsMetadataBody.sourceOfTruth.messageDraft,
      customerSourceOfTruth:
        messageDraftsMetadataBody.sourceOfTruth.customer,
      aiInputMode:
        messageDraftsMetadataBody.aiPlatformCoreActivity.inputMode,
    },
    {
      appName: "sns-planner",
      operation: "MessageDraft.Generate",
      endpoint: "POST /api/message-drafts",
      sourceApp: "growth-engine",
      targetApp: "sns-planner",
      eventName: "sns.message_draft.created.v1",
      identityMode: "workspaceId+userId",
      professionalIdRequired: false,
      messageDraftSourceOfTruth: true,
      customerSourceOfTruth: false,
      aiInputMode: "reference_ids_only",
    },
  );
  assert.ok(
    messageDraftsMetadataBody.requiredFields.includes("workspaceId"),
  );
  assert.ok(
    messageDraftsMetadataBody.supportedTargetStudios.includes("numeria"),
  );
  assert.ok(
    messageDraftsMetadataBody.supportedTargetStudios.includes("velvet"),
  );
  assert.ok(
    messageDraftsMetadataBody.supportedChannels.includes("instagram_dm"),
  );
  assert.ok(
    messageDraftsMetadataBody.prohibitedPayloadFields.includes("salesAmount"),
  );
  assert.equal(
    messageDraftsMetadataBody.sampleRequest.inputRef.customerId,
    "cus_test_001",
  );
  assert.match(messageDraftsMetadataBody.timestamp, /^\d{4}-\d{2}-\d{2}T/);

  const messageDraftsMetadataV2 = await fetchFromBuiltWorker(
    "/api/message-drafts/metadata",
  );
  assert.equal(messageDraftsMetadataV2.status, 200);
  const messageDraftsMetadataV2Body = await messageDraftsMetadataV2.json();
  assert.equal(messageDraftsMetadataV2Body.supported, true);
  assert.equal(messageDraftsMetadataV2Body.draftType, "MessageDraft");
  assert.equal(messageDraftsMetadataV2Body.status, "success");
  assert.equal(
    messageDraftsMetadataV2Body.operation,
    "MessageDraft.Metadata",
  );
  assert.equal(
    messageDraftsMetadataV2Body.generateEndpoint,
    "POST /api/message-drafts",
  );
  assert.ok(
    messageDraftsMetadataV2Body.supportedTones.includes("premium"),
  );
  assert.ok(
    messageDraftsMetadataV2Body.requiredFields.includes("inputRef"),
  );
  assert.ok(
    messageDraftsMetadataV2Body.prohibitedPayloadFields.includes(
      "paymentStatus",
    ),
  );
  assert.equal(
    messageDraftsMetadataV2Body.aiPlatformCoreActivity.inputMode,
    "reference_ids_only",
  );
  assert.ok(
    messageDraftsMetadataV2Body.events.includes(
      "sns.message_draft.created.v1",
    ),
  );

  for (const path of [
    "/health",
    "/version",
    "/contracts/status",
    "/api/post-drafts",
    "/api/post-drafts/metadata",
    "/api/message-drafts",
    "/api/message-drafts/metadata",
  ]) {
    const options = await fetchFromBuiltWorker(path, { method: "OPTIONS" });
    assert.equal(options.status, 200);
    assert.equal(options.headers.get("access-control-allow-origin"), "*");
    assert.equal(
      options.headers.get("access-control-allow-methods"),
      allowMethods,
    );
    assert.equal(
      options.headers.get("access-control-allow-headers"),
      "Content-Type, X-Trace-Id, X-Correlation-Id, X-Source-App",
    );
  }
});

test("accepts Growth Engine post draft requests", async () => {
  const originalFetch = globalThis.fetch;
  let activityRequestBody;

  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "https://ai-platform-core-preview.illusionddt.chatgpt.site/api/activities",
    );
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers["x-trace-id"], "trace_test_001");
    assert.equal(init?.headers["x-correlation-id"], "corr_test_001");
    assert.equal(init?.headers["x-source-app"], "sns-planner");
    activityRequestBody = JSON.parse(String(init?.body));

    return Response.json(
      {
        activityId: "activity_test_001",
        workspaceId: activityRequestBody.workspaceId,
        status: "activity_created",
        sourceApp: activityRequestBody.sourceApp,
        capability: activityRequestBody.capability,
      },
      { status: 201 },
    );
  };

  let response;

  try {
    response = await fetchFromBuiltWorker("/api/post-drafts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-trace-id": "trace_test_001",
        "x-correlation-id": "corr_test_001",
        "x-source-app": "growth-engine",
      },
      body: JSON.stringify({
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
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("x-trace-id"), "trace_test_001");
  assert.equal(response.headers.get("x-correlation-id"), "corr_test_001");
  assert.match(response.headers.get("x-request-id") ?? "", /^req_/);

  const body = await response.json();
  assert.match(body.draftId, /^draft_/);
  assert.deepEqual(
    {
      workspaceId: activityRequestBody.workspaceId,
      userId: activityRequestBody.userId,
      sourceApp: activityRequestBody.sourceApp,
      activityType: activityRequestBody.activityType,
      capability: activityRequestBody.capability,
      channel: activityRequestBody.inputRef.channel,
    },
    {
      workspaceId: "ws_test_001",
      userId: "user_test_owner_001",
      sourceApp: "sns-planner",
      activityType: "sns.post_draft.created",
      capability: "sns.post.generate",
      channel: "instagram",
    },
  );
  assert.deepEqual(
    {
      workspaceId: body.workspaceId,
      status: body.status,
      draftStatus: body.draftStatus,
      channel: body.channel,
      aiActivityStatusCode: body.aiActivityStatusCode,
      traceId: body.traceId,
      correlationId: body.correlationId,
      requestId: body.requestId,
      eventName: body.eventName,
      activityId: body.recordedActivity.activityId,
      activityWorkspaceId: body.recordedActivity.workspaceId,
      activitySourceApp: body.recordedActivity.sourceApp,
      activityCapability: body.recordedActivity.capability,
    },
    {
      workspaceId: "ws_test_001",
      status: "success",
      draftStatus: "draft_created",
      channel: "instagram",
      aiActivityStatusCode: 201,
      traceId: "trace_test_001",
      correlationId: "corr_test_001",
      requestId: response.headers.get("x-request-id"),
      eventName: "sns.post_draft.created.v1",
      activityId: "activity_test_001",
      activityWorkspaceId: "ws_test_001",
      activitySourceApp: "sns-planner",
      activityCapability: "sns.post.generate",
    },
  );
});

test("accepts Growth Engine message draft requests", async () => {
  const originalFetch = globalThis.fetch;
  let activityRequestBody;

  globalThis.fetch = async (input, init) => {
    assert.equal(
      String(input),
      "https://ai-platform-core-preview.illusionddt.chatgpt.site/api/activities",
    );
    assert.equal(init?.method, "POST");
    assert.equal(init?.headers["x-trace-id"], "trace_msg_test_001");
    assert.equal(init?.headers["x-correlation-id"], "corr_msg_test_001");
    assert.equal(init?.headers["x-source-app"], "sns-planner");
    activityRequestBody = JSON.parse(String(init?.body));

    return Response.json(
      {
        activityId: "activity_msg_test_001",
        workspaceId: activityRequestBody.workspaceId,
        status: "activity_created",
        sourceApp: activityRequestBody.sourceApp,
        capability: activityRequestBody.capability,
      },
      { status: 201 },
    );
  };

  let response;

  try {
    response = await fetchFromBuiltWorker("/api/message-drafts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-trace-id": "trace_msg_test_001",
        "x-correlation-id": "corr_msg_test_001",
        "x-source-app": "growth-engine",
      },
      body: JSON.stringify({
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
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), "*");
  assert.equal(response.headers.get("x-trace-id"), "trace_msg_test_001");
  assert.equal(response.headers.get("x-correlation-id"), "corr_msg_test_001");
  assert.match(response.headers.get("x-request-id") ?? "", /^req_/);

  const body = await response.json();
  assert.match(body.messageDraftId, /^msg_draft_/);
  assert.match(activityRequestBody.inputRef.messageDraftId, /^msg_draft_/);
  assert.deepEqual(
    {
      workspaceId: activityRequestBody.workspaceId,
      userId: activityRequestBody.userId,
      sourceApp: activityRequestBody.sourceApp,
      activityType: activityRequestBody.activityType,
      capability: activityRequestBody.capability,
      channel: activityRequestBody.inputRef.channel,
      purpose: activityRequestBody.inputRef.purpose,
      targetStudio: activityRequestBody.inputRef.targetStudio,
      customerId: activityRequestBody.inputRef.customerId,
      reservationId: activityRequestBody.inputRef.reservationId,
      campaignId: activityRequestBody.inputRef.campaignId,
      followupId: activityRequestBody.inputRef.followupId,
    },
    {
      workspaceId: "ws_test_001",
      userId: "user_test_owner_001",
      sourceApp: "sns-planner",
      activityType: "sns.message_draft.created",
      capability: "sns.message.generate",
      channel: "line",
      purpose: "followup",
      targetStudio: "numeria",
      customerId: "cus_test_001",
      reservationId: "res_test_001",
      campaignId: "camp_test_001",
      followupId: "follow_test_001",
    },
  );
  assert.deepEqual(
    {
      workspaceId: body.workspaceId,
      status: body.status,
      messageDraftStatus: body.messageDraftStatus,
      channel: body.channel,
      purpose: body.purpose,
      targetStudio: body.targetStudio,
      generatedText: body.generatedText,
      variantCount: body.variants.length,
      firstVariantId: body.variants[0].variantId,
      aiActivityStatusCode: body.aiActivityStatusCode,
      traceId: body.traceId,
      correlationId: body.correlationId,
      requestId: body.requestId,
      eventName: body.eventName,
      activityId: body.recordedActivity.activityId,
      activityWorkspaceId: body.recordedActivity.workspaceId,
      activitySourceApp: body.recordedActivity.sourceApp,
      activityCapability: body.recordedActivity.capability,
    },
    {
      workspaceId: "ws_test_001",
      status: "success",
      messageDraftStatus: "draft_created",
      channel: "line",
      purpose: "followup",
      targetStudio: "numeria",
      generatedText: body.generatedText,
      variantCount: 5,
      firstVariantId: "var_001",
      aiActivityStatusCode: 201,
      traceId: "trace_msg_test_001",
      correlationId: "corr_msg_test_001",
      requestId: response.headers.get("x-request-id"),
      eventName: "sns.message_draft.created.v1",
      activityId: "activity_msg_test_001",
      activityWorkspaceId: "ws_test_001",
      activitySourceApp: "sns-planner",
      activityCapability: "sns.message.generate",
    },
  );
});

test("rejects message draft payloads with prohibited source-of-truth fields", async () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalled = false;

  globalThis.fetch = async () => {
    upstreamCalled = true;
    return Response.json({}, { status: 201 });
  };

  let response;

  try {
    response = await fetchFromBuiltWorker("/api/message-drafts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        workspaceId: "ws_test_001",
        userId: "user_test_owner_001",
        sourceApp: "growth-engine",
        targetStudio: "velvet",
        channel: "line",
        purpose: "repeat_visit",
        audienceSegment: "repeat_customer",
        tone: "professional",
        cta: "booking_page",
        paymentStatus: "paid",
        inputRef: {
          customerId: "cus_test_001",
          birthday: "1990-01-01",
        },
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(upstreamCalled, false);
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.status, "error");
  assert.equal(body.error.code, "CONTRACT_VIOLATION");
  assert.ok(body.error.prohibitedFields.includes("paymentStatus"));
  assert.ok(body.error.prohibitedFields.includes("inputRef.birthday"));
});

test("maps AI Platform Core 522 to environment limitation warning", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    Response.json(
      {
        status: "error",
        error: {
          code: "ENVIRONMENT_LIMITATION",
        },
      },
      { status: 522 },
    );

  let response;

  try {
    response = await fetchFromBuiltWorker("/api/post-drafts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-trace-id": "trace_test_522",
        "x-correlation-id": "corr_test_522",
        "x-source-app": "growth-engine",
      },
      body: JSON.stringify({
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
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.deepEqual(
    {
      status: body.status,
      draftStatus: body.draftStatus,
      aiActivityStatusCode: body.aiActivityStatusCode,
      errorCode: body.error.code,
      retryable: body.error.retryable,
    },
    {
      status: "warning",
      draftStatus: "draft_created",
      aiActivityStatusCode: 522,
      errorCode: "ENVIRONMENT_LIMITATION",
      retryable: true,
    },
  );
});

test("maps AI Platform Core 522 for message drafts to environment limitation warning", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    Response.json(
      {
        status: "error",
        error: {
          code: "ENVIRONMENT_LIMITATION",
        },
      },
      { status: 522 },
    );

  let response;

  try {
    response = await fetchFromBuiltWorker("/api/message-drafts", {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "x-trace-id": "trace_msg_test_522",
        "x-correlation-id": "corr_msg_test_522",
        "x-source-app": "growth-engine",
      },
      body: JSON.stringify({
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
        },
      }),
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.equal(response.status, 200);

  const body = await response.json();
  assert.deepEqual(
    {
      status: body.status,
      messageDraftStatus: body.messageDraftStatus,
      aiActivityStatusCode: body.aiActivityStatusCode,
      errorCode: body.error.code,
      retryable: body.error.retryable,
    },
    {
      status: "warning",
      messageDraftStatus: "draft_created",
      aiActivityStatusCode: 522,
      errorCode: "ENVIRONMENT_LIMITATION",
      retryable: true,
    },
  );
});
