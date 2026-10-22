import { handleFinish } from "../../stats-handlers.mjs";

export function onRequestPost(context) {
  return handleFinish(context);
}
