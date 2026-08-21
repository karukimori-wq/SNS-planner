import {
  appName,
  jsonResponse,
  optionsResponse,
  timestamp,
} from "../api-metadata";

export function GET() {
  return jsonResponse({
    appName,
    status: "ok",
    timestamp: timestamp(),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
