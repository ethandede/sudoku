(function () {
  var form = document.getElementById("contact-form");
  if (!form) return;

  var status = document.getElementById("contact-status");
  var submit = form.querySelector("button[type=submit]");
  var slot = document.getElementById("turnstile-slot");

  function setStatus(state, text) {
    status.hidden = false;
    status.dataset.state = state;
    status.textContent = text;
  }

  fetch("/api/contact", { headers: { accept: "application/json" } })
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      if (!data || !data.ready || !data.siteKey) {
        submit.disabled = true;
        setStatus(
          "unavailable",
          "The contact form is not available yet. It will open once mail delivery is configured."
        );
        return;
      }
      var script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = function () {
        if (!window.turnstile) return;
        slot.classList.add("is-ready");
        window.turnstile.render("#turnstile-slot", {
          sitekey: data.siteKey,
          size: "flexible",
        });
      };
      document.head.appendChild(script);
    })
    .catch(function () {
      submit.disabled = true;
      setStatus("unavailable", "The contact form is not available yet.");
    });

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    if (submit.disabled && status.dataset.state === "unavailable") return;

    var token = "";
    if (window.turnstile && typeof window.turnstile.getResponse === "function") {
      token = window.turnstile.getResponse() || "";
    }
    submit.disabled = true;
    setStatus("pending", "Sending…");

    fetch("/api/contact", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        name: form.name.value,
        email: form.email.value,
        message: form.message.value,
        company: form.company.value,
        turnstileToken: token,
      }),
    })
      .then(function (response) {
        return response.json().then(function (body) {
          return { ok: response.ok, body: body };
        });
      })
      .then(function (result) {
        if (result.ok && result.body && result.body.ok) {
          form.reset();
          if (window.turnstile && typeof window.turnstile.reset === "function") {
            window.turnstile.reset();
          }
          setStatus("success", "Message sent. A reply, if you need one, goes to the email you entered.");
          return;
        }
        setStatus("error", (result.body && result.body.error) || "The message could not be sent.");
      })
      .catch(function () {
        setStatus("error", "The message could not be sent. Check your connection and try again.");
      })
      .then(function () {
        if (status.dataset.state !== "unavailable") submit.disabled = false;
      });
  });
})();
