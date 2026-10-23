import { handleDelete } from "../../account-handlers.mjs";

export function onRequestPost(context) {
  return handleDelete(context);
}
