const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function cleanLine(value) {
  return String(value ?? "").replace(/[\r\n]+/g, " ").trim();
}

export function validateContact(input) {
  const company = cleanLine(input && input.company);
  if (company) return { ok: true, honeypot: true };

  const name = cleanLine(input && input.name);
  const email = cleanLine(input && input.email);
  const message = String((input && input.message) ?? "").replace(/\r\n/g, "\n").trim();

  if (name.length < 1 || name.length > 80) {
    return { ok: false, error: "Enter your name (80 characters or fewer)." };
  }
  if (email.length < 3 || email.length > 120 || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (message.length < 10 || message.length > 4000) {
    return { ok: false, error: "Write a message between 10 and 4000 characters." };
  }
  return { ok: true, name, email, message };
}

export function contactReady(env) {
  return Boolean(
    env &&
      env.TURNSTILE_SITE_KEY &&
      env.TURNSTILE_SECRET_KEY &&
      env.CONTACT_TO &&
      env.EMAIL &&
      typeof env.EMAIL.send === "function"
  );
}
