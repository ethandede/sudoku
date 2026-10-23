// Optional account UI and sync. localStorage stays the source of play.
// This script does nothing harmful when the player is signed out.
(function () {
  const DEBOUNCE_MS = 1500;
  let hooks = { snapshot: () => ({}), apply: () => {} };
  let signedIn = false;
  let email = "";
  let ready = false;
  let siteKey = "";
  let dirty = false;
  let applying = false;
  let timer = 0;
  let tail = Promise.resolve();
  let epoch = 0;
  let holdProgress = false;
  let turnstileId = "";
  let pendingNote = "";

  function $(id) {
    return document.getElementById(id);
  }

  function noteChange() {
    if (applying) return;
    dirty = true;
    if (!signedIn) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      flush();
    }, DEBOUNCE_MS);
  }

  function flush() {
    window.clearTimeout(timer);
    const gen = epoch;
    const run = tail.then(() => flushOnce(gen));
    tail = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  function outgoing() {
    const bundle = hooks.snapshot() || {};
    if (holdProgress) {
      delete bundle.progress;
      delete bundle.progressUpdatedAt;
    }
    return bundle;
  }

  async function flushOnce(gen) {
    if (!signedIn || !dirty) return;
    const sent = JSON.stringify(outgoing());
    let response;
    try {
      response = await fetch("/api/account/sync", {
        method: "POST",
        credentials: "same-origin",
        keepalive: true,
        headers: { "content-type": "application/json", accept: "application/json" },
        body: sent,
      });
    } catch {
      return;
    }
    if (gen !== epoch) return;
    if (response.status === 401) {
      signedIn = false;
      email = "";
      dirty = false;
      renderSlots();
      return;
    }
    if (!response.ok) return;
    let data = null;
    try {
      data = await response.json();
    } catch {
      return;
    }
    const changedWhileWaiting = JSON.stringify(outgoing()) !== sent;
    applying = true;
    try {
      if (data && data.bundle) hooks.apply(data.bundle);
    } finally {
      applying = false;
    }
    dirty = changedWhileWaiting;
    if (dirty) noteChange();
    renderSlots();
  }

  async function refreshSession() {
    let response;
    try {
      response = await fetch("/api/account", {
        credentials: "same-origin",
        headers: { accept: "application/json" },
      });
    } catch {
      return;
    }
    if (!response.ok) return;
    let data = null;
    try {
      data = await response.json();
    } catch {
      return;
    }
    signedIn = Boolean(data && data.signedIn);
    email = data && data.email ? String(data.email) : "";
    ready = Boolean(data && data.ready);
    siteKey = data && data.siteKey ? String(data.siteKey) : "";
    renderSlots();
  }

  async function pullBeforePlay() {
    const gen = epoch;
    await refreshSession();
    if (gen !== epoch) return;
    if (!signedIn) return;
    dirty = true;
    await flush();
  }

  function invalidate() {
    epoch += 1;
  }

  function setHoldProgress() {
    holdProgress = true;
  }

  function renderSlot(node) {
    if (!node) return;
    node.replaceChildren();
    if (signedIn) {
      const line = document.createElement("p");
      line.className = "account-signed-in";
      line.append("Signed in as ");
      const address = document.createElement("span");
      address.className = "account-email";
      address.textContent = email;
      line.append(address);
      node.append(line);
      node.append(signOutButton(), signOutEverywhereControl(), deleteControl());
      return;
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "account-link";
    button.dataset.accountOpen = "1";
    button.textContent = "Save your progress";
    node.append(button);
  }

  function signOutButton() {
    const out = document.createElement("button");
    out.type = "button";
    out.className = "account-link";
    out.dataset.accountSignout = "1";
    out.textContent = "Sign out";
    return out;
  }

  function signOutEverywhereControl() {
    if (!window.RareDelete) return document.createElement("span");
    return window.RareDelete.create({
      label: "Sign out everywhere",
      note: "Ends the saved session on every device. This device keeps its own copy.",
      triggerLabel: "Sign out everywhere",
      confirmLabel: "Confirm sign out everywhere",
      cancelLabel: "Cancel sign out everywhere",
      statusDeleted: "Signed out everywhere",
      statusKept: "Kept",
      onConfirm: signOutEverywhere,
    });
  }

  function deleteControl() {
    if (!window.RareDelete) return document.createElement("span");
    return window.RareDelete.create({
      label: "Delete account",
      note: "Removes the email and the saved copy on the server. This device keeps its own copy.",
      triggerLabel: "Delete account",
      confirmLabel: "Confirm delete account",
      cancelLabel: "Cancel delete account",
      statusDeleted: "Account deleted",
      statusKept: "Kept",
      onConfirm: deleteAccount,
    });
  }

  function renderSlots() {
    renderSlot($("account-stats"));
    renderSlot($("account-settings"));
  }

  function setStatus(state, text) {
    const status = $("account-status");
    if (!status) return;
    status.hidden = !text;
    status.dataset.state = state || "";
    status.textContent = text || "";
  }

  function showCode(show) {
    const code = $("account-code");
    const request = $("account-request");
    if (code) code.hidden = !show;
    if (request) request.hidden = show;
  }

  function ensureTurnstile() {
    const slot = $("account-turnstile");
    if (!slot || !siteKey || turnstileId) return;
    function render() {
      if (!window.turnstile || turnstileId) return;
      turnstileId = window.turnstile.render("#account-turnstile", {
        sitekey: siteKey,
        size: "flexible",
      });
      slot.classList.add("is-ready");
    }
    if (window.turnstile) {
      render();
      return;
    }
    const existing = document.querySelector("script[data-account-turnstile]");
    if (existing) {
      existing.addEventListener("load", render);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.dataset.accountTurnstile = "1";
    script.addEventListener("load", render);
    document.head.appendChild(script);
  }

  function openSheet() {
    const stats = $("stats-modal");
    const settings = $("settings-modal");
    if (stats) stats.hidden = true;
    if (settings) settings.hidden = true;
    const modal = $("account-modal");
    if (!modal) return;
    modal.hidden = false;
    const signed = $("account-signed");
    const request = $("account-request");
    if (signed) signed.hidden = !signedIn;
    if (request) request.hidden = signedIn;
    if ($("account-code")) $("account-code").hidden = true;
    const address = $("account-signed-email");
    if (address) address.textContent = email;
    if (!signedIn) {
      ensureTurnstile();
      if (!ready) setStatus("error", "Sign-in email is not set up on the server yet.");
      else if (pendingNote) setStatus("error", pendingNote);
      else setStatus("", "");
      const input = modal.querySelector("input[name=email]");
      if (input) input.focus();
    } else {
      setStatus("", "");
    }
    pendingNote = "";
  }

  function closeSheet() {
    const modal = $("account-modal");
    if (modal) modal.hidden = true;
  }

  async function postJson(url, body) {
    const response = await fetch(url, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(body),
    });
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    return { ok: response.ok, status: response.status, data };
  }

  function bind() {
    document.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest("[data-account-open]")) {
        event.preventDefault();
        openSheet();
      }
      if (target.closest("[data-account-signout]")) {
        event.preventDefault();
        signOut();
      }
    });
    const request = $("account-request");
    if (request) {
      request.addEventListener("submit", (event) => {
        event.preventDefault();
        submitRequest(request);
      });
    }
    const code = $("account-code");
    if (code) {
      code.addEventListener("submit", (event) => {
        event.preventDefault();
        submitCode(code);
      });
    }
    const signOutControl = $("account-signout");
    if (signOutControl) signOutControl.addEventListener("click", signOut);
    const everywhere = $("account-signout-all");
    if (everywhere && !everywhere.firstChild) everywhere.append(signOutEverywhereControl());
    const deleteSlot = $("account-delete-slot");
    if (deleteSlot && !deleteSlot.firstChild) deleteSlot.append(deleteControl());
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    window.addEventListener("pagehide", () => flush());
    window.addEventListener("online", () => {
      if (dirty) flush();
    });
  }

  async function submitRequest(form) {
    const submit = form.querySelector("button[type=submit]");
    if (submit) submit.disabled = true;
    setStatus("pending", "Sending…");
    let token = "";
    if (window.turnstile && turnstileId && typeof window.turnstile.getResponse === "function") {
      token = window.turnstile.getResponse(turnstileId) || "";
    }
    try {
      const result = await postJson("/api/account/request", {
        email: form.email.value,
        turnstileToken: token,
      });
      if (result.ok && result.data && result.data.ok) {
        setStatus("", "Check your email for a sign-in link and a 6-digit code. They expire in 15 minutes.");
        showCode(true);
        const codeInput = document.querySelector("#account-code input[name=code]");
        if (codeInput) codeInput.focus();
        return;
      }
      setStatus("error", (result.data && result.data.error) || "The sign-in email could not be sent.");
      if (window.turnstile && turnstileId && typeof window.turnstile.reset === "function") {
        window.turnstile.reset(turnstileId);
      }
    } catch {
      setStatus("error", "The sign-in email could not be sent. Check the connection and try again.");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  async function submitCode(form) {
    const submit = form.querySelector("button[type=submit]");
    if (submit) submit.disabled = true;
    setStatus("pending", "Signing in…");
    const emailInput = document.querySelector("#account-request input[name=email]");
    try {
      const result = await postJson("/api/account/verify", {
        email: emailInput ? emailInput.value : "",
        code: form.code.value,
      });
      if (result.ok && result.data && result.data.ok) {
        signedIn = true;
        email = result.data.email || (emailInput ? emailInput.value : "");
        ready = true;
        renderSlots();
        showSigned();
        dirty = true;
        await flush();
        setStatus("", "Signed in. This device and your account now have the same progress.");
        return;
      }
      setStatus("error", (result.data && result.data.error) || "That code is not valid.");
    } catch {
      setStatus("error", "Sign-in could not be completed. Check the connection and try again.");
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  function showSigned() {
    const signed = $("account-signed");
    const request = $("account-request");
    const code = $("account-code");
    if (signed) signed.hidden = false;
    if (request) request.hidden = true;
    if (code) code.hidden = true;
    const address = $("account-signed-email");
    if (address) address.textContent = email;
  }

  function finishSignedOut(message) {
    signedIn = false;
    email = "";
    dirty = false;
    renderSlots();
    closeSheet();
    const live = $("live-region");
    if (live) live.textContent = message;
  }

  async function signOut() {
    try {
      await postJson("/api/account/signout", {});
    } catch {
      /* the local signed-in flag still clears */
    }
    finishSignedOut("Signed out. This device still has its copy.");
  }

  async function signOutEverywhere() {
    try {
      const result = await postJson("/api/account/signout-all", {});
      if (!result.ok) {
        setStatus("error", (result.data && result.data.error) || "Could not sign out everywhere.");
        return;
      }
    } catch {
      setStatus("error", "Could not sign out everywhere. Check the connection and try again.");
      return;
    }
    finishSignedOut("Signed out everywhere. This device still has its copy.");
  }

  async function deleteAccount() {
    try {
      const result = await postJson("/api/account/delete", {});
      if (!result.ok) {
        setStatus("error", (result.data && result.data.error) || "The account could not be deleted.");
        return;
      }
    } catch {
      setStatus("error", "The account could not be deleted. Check the connection and try again.");
      return;
    }
    finishSignedOut("The account is deleted. This device still has its copy.");
  }

  function consumeQuery() {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get("account");
    if (!flag) return;
    params.delete("account");
    const next = params.toString();
    const path = `${window.location.pathname}${next ? `?${next}` : ""}${window.location.hash}`;
    window.history.replaceState(null, "", path);
    if (flag === "invalid") pendingNote = "That sign-in link expired. Request a new one.";
    if (flag === "in") pendingNote = "signed-in";
  }

  function attach(next) {
    hooks = {
      snapshot: () => ({}),
      apply: () => {},
      ...next,
    };
  }

  consumeQuery();
  bind();
  renderSlots();
  refreshSession().then(() => {
    if (pendingNote === "signed-in") {
      pendingNote = "";
      openSheet();
      return;
    }
    if (pendingNote) openSheet();
  });

  window.SudokuAccount = {
    attach,
    pullBeforePlay,
    noteChange,
    flush,
    invalidate,
    holdProgress: setHoldProgress,
    open: openSheet,
  };
})();
