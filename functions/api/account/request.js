import { handleRequest } from "../../account-handlers.mjs";

export function onRequestPost(context) {
  return handleRequest(context);
}
