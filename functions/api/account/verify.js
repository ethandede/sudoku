import { handleVerifyGet, handleVerifyPost } from "../../account-handlers.mjs";

export function onRequestGet(context) {
  return handleVerifyGet(context);
}

export function onRequestPost(context) {
  return handleVerifyPost(context);
}
