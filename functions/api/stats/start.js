import { handleStart } from "../../stats-handlers.mjs";

export function onRequestPost(context) {
  return handleStart(context);
}
