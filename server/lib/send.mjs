// Envoi de la newsletter : e-mail (Brevo ou SMTP) et WhatsApp (CallMeBot ou Twilio).
// Tout se configure par variables d'environnement (secrets GitHub), rien en dur.

const env = (k) => (process.env[k] || "").trim();

export function channelsConfigured() {
  const c = [];
  if (env("BREVO_API_KEY") && env("MAIL_TO")) c.push("e-mail (Brevo)");
  else if (env("SMTP_HOST") && env("MAIL_TO")) c.push("e-mail (SMTP)");
  if (env("CALLMEBOT_PHONE") && env("CALLMEBOT_APIKEY")) c.push("WhatsApp (CallMeBot)");
  if (env("TWILIO_SID") && env("TWILIO_TOKEN") && env("WHATSAPP_TO")) c.push("WhatsApp (Twilio)");
  return c;
}

async function sendBrevo(subject, html, text) {
  const to = env("MAIL_TO").split(",").map((e) => ({ email: e.trim() })).filter((x) => x.email);
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env("BREVO_API_KEY"), "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: env("MAIL_FROM_NAME") || "Quantum Algo", email: env("MAIL_FROM") || to[0].email },
      to, subject, htmlContent: html, textContent: text,
    }),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text()}`);
}

async function sendSmtp(subject, html, text) {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(env("SMTP_PORT") || 465);
  const t = nodemailer.createTransport({
    host: env("SMTP_HOST"), port, secure: port === 465,
    auth: { user: env("SMTP_USER"), pass: env("SMTP_PASS") },
  });
  await t.sendMail({
    from: `"${env("MAIL_FROM_NAME") || "Quantum Algo"}" <${env("MAIL_FROM") || env("SMTP_USER")}>`,
    to: env("MAIL_TO"), subject, html, text,
  });
}

async function sendCallMeBot(text) {
  // CallMeBot accepte des messages courts : on decoupe si besoin
  const parts = [];
  let buf = "";
  for (const line of text.split("\n")) {
    if ((buf + "\n" + line).length > 900) { parts.push(buf); buf = line; } else buf = buf ? buf + "\n" + line : line;
  }
  if (buf) parts.push(buf);
  for (const p of parts) {
    const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(env("CALLMEBOT_PHONE"))}&text=${encodeURIComponent(p)}&apikey=${encodeURIComponent(env("CALLMEBOT_APIKEY"))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`CallMeBot ${res.status}`);
    await new Promise((r) => setTimeout(r, 2500));
  }
}

async function sendTwilio(text) {
  const sid = env("TWILIO_SID");
  const body = new URLSearchParams({
    From: "whatsapp:" + (env("TWILIO_FROM") || "+14155238886"),
    To: "whatsapp:" + env("WHATSAPP_TO"),
    Body: text.slice(0, 1550),
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: "Basic " + Buffer.from(`${sid}:${env("TWILIO_TOKEN")}`).toString("base64"), "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Twilio ${res.status}: ${await res.text()}`);
}

export async function sendAll({ subject, html, text, whatsapp }) {
  const done = [], errors = [];
  const tryIt = async (name, fn) => { try { await fn(); done.push(name); } catch (e) { errors.push(`${name}: ${e.message}`); } };
  if (env("BREVO_API_KEY") && env("MAIL_TO")) await tryIt("e-mail", () => sendBrevo(subject, html, text));
  else if (env("SMTP_HOST") && env("MAIL_TO")) await tryIt("e-mail", () => sendSmtp(subject, html, text));
  if (env("CALLMEBOT_PHONE") && env("CALLMEBOT_APIKEY")) await tryIt("WhatsApp", () => sendCallMeBot(whatsapp));
  if (env("TWILIO_SID") && env("TWILIO_TOKEN") && env("WHATSAPP_TO")) await tryIt("WhatsApp Twilio", () => sendTwilio(whatsapp));
  return { done, errors };
}
