import { handleSignOutAll } from "../../account-handlers.mjs";

export function onRequestPost(context) {
  return handleSignOutAll(context);
}
