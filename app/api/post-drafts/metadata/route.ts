import { contractVersion, jsonResponse, optionsResponse, timestamp } from "../../../api-metadata";

export function GET() {
  return jsonResponse({
    supported: true,
    draftType: "PostDraft",
    contractVersion,
    status: "success",
    supportedChannels: [
      "instagram",
      "instagram_story",
      "x",
      "threads",
      "facebook",
      "linkedin",
      "other",
    ],
    supportedPurposes: [
      "awareness",
      "line_registration",
      "free_consultation",
      "reservation",
      "repeat",
      "referral",
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
    supportedTargetStudios: ["numeria", "velvet"],
    events: ["sns.post_draft.created.v1", "sns.post_draft.updated.v1"],
    primaryResponsibility: [
      "PostDraft",
      "post_text",
      "hashtags",
      "sns_specific_formatting",
      "post_schedule",
    ],
    communicationPlannerBoundary: {
      ownsLiveConversation: false,
      ownsUnifiedInbox: false,
      ownsConversationContext: false,
      ownsReplyDraft: false,
      ownsSafetyCheck: false,
      sendsMessages: false,
      owner: "communication-planner",
    },
    sourceOfTruth: {
      postDraft: true,
      customer: false,
      payment: false,
      sales: false,
    },
    timestamp: timestamp(),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
