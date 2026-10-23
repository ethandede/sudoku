import { handleSession } from "../../account-handlers.mjs";

export function onRequestGet(context) {
  return handleSession(context);
}
