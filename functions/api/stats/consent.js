// Region check for the anonymous stats id.
//
// A random first-party id in localStorage, used only to dedupe gameplay
// stats, is still storage on the device. Playing does not need it, so it is
// not strictly necessary. Visitors in the EEA, the UK, and Switzerland do
// not get an id, and the game does not send stats, until Google's consent
// mode reports analytics_storage = granted. That is the same choice as
// Analytics. Elsewhere the Settings toggle is enough.
//
// The country comes from request.cf.country and is not stored, not logged,
// and not copied into the cached summary. This response is private.

import { handleConsent } from "../../stats-handlers.mjs";

export function onRequestGet(context) {
  return handleConsent(context);
}
