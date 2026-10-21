import { handleSummary } from "../../stats-handlers.mjs";

export function onRequestGet(context) {
  return handleSummary(context);
}
