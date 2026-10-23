import { handleSignOut } from "../../account-handlers.mjs";

export function onRequestPost(context) {
  return handleSignOut(context);
}
