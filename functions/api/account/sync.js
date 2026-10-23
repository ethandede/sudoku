import { handleSync } from "../../account-handlers.mjs";

export function onRequestPost(context) {
  return handleSync(context);
}
