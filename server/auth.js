import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";

const COOKIE_NAME = "pack25_session";
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function sign(expiry) {
  const hmac = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(String(expiry)).digest("hex");
  return `${expiry}.${hmac}`;
}

function verify(token) {
  if (!token) return false;
  const dotIndex = token.lastIndexOf(".");
  if (dotIndex === -1) return false;
  const expiry = token.slice(0, dotIndex);
  const hmac = token.slice(dotIndex + 1);
  if (!/^\d+$/.test(expiry) || Number(expiry) < Date.now()) return false;

  const expected = crypto.createHmac("sha256", process.env.SESSION_SECRET).update(expiry).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const actualBuf = Buffer.from(hmac, "hex");
  // Unequal-length buffers throw in timingSafeEqual instead of failing cleanly,
  // so a forged/truncated cookie must be length-checked first.
  if (expectedBuf.length !== actualBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, actualBuf);
}

function parseCookies(req) {
  const header = req.headers.cookie;
  if (!header) return {};
  return Object.fromEntries(
    header.split(";").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, decodeURIComponent(rest.join("="))];
    })
  );
}

function setSessionCookie(res, token) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (process.env.NODE_ENV === "production") parts.push("Secure");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0`);
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req);
  return verify(cookies[COOKIE_NAME]);
}

export function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

// Guards the single shared leader password against brute-force guessing.
// Keyed per-IP (see app.set("trust proxy", 1) in server/index.js) so one
// abusive client can't lock out everyone else.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." },
});

export function registerAuthRoutes(app) {
  app.post("/api/auth/login", loginLimiter, async (req, res) => {
    const { password } = req.body || {};
    if (typeof password !== "string" || !password) {
      return res.status(400).json({ error: "Password is required" });
    }
    const hash = process.env.LEADER_PASSWORD_HASH;
    if (!hash) {
      return res.status(500).json({ error: "Server is not configured with a leader password" });
    }
    const valid = await bcrypt.compare(password, hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    setSessionCookie(res, sign(Date.now() + SESSION_TTL_MS));
    res.json({ authenticated: true });
  });

  // Stateless session: this only clears the cookie client-side. A copied
  // cookie value stays valid until it expires; rotating SESSION_SECRET is the
  // only way to invalidate every session at once.
  app.post("/api/auth/logout", (req, res) => {
    clearSessionCookie(res);
    res.json({ authenticated: false });
  });

  app.get("/api/auth/session", (req, res) => {
    res.json({ authenticated: isAuthenticated(req) });
  });
}
