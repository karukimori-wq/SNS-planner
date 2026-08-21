import {
  appName,
  appVersion,
  contractVersion,
  jsonResponse,
  optionsResponse,
  timestamp,
} from "../api-metadata";

export function GET() {
  return jsonResponse({
    appName,
    appVersion,
    contractVersion,
    timestamp: timestamp(),
  });
}

export function OPTIONS() {
  return optionsResponse();
}
