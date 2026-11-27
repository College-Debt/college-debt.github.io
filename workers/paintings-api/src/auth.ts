import { HttpError, ViewerInfo } from "./types";

interface AccessJwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

interface AccessJwtPayload {
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
  email?: string;
  name?: string;
  common_name?: string;
  sub?: string;
}

interface JwksResponse {
  keys?: Array<JsonWebKey & { kid?: string; kty?: string; alg?: string; use?: string }>;
}

const CLOCK_SKEW_SECONDS = 30;
const JWKS_CACHE_TTL_SECONDS = 300;

function decodeBase64UrlToBytes(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4;
  const padded = pad ? normalized + "=".repeat(4 - pad) : normalized;
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new HttpError(401, "Invalid access token encoding.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function decodeBase64UrlJson<T>(input: string): T {
  try {
    const bytes = decodeBase64UrlToBytes(input);
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(401, "Invalid access token payload.");
  }
}

/**
 * Constant-time string comparison via SHA-256 fixed-width digest + timingSafeEqual.
 */
async function timingSafeStringEqual(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(a)),
    crypto.subtle.digest("SHA-256", encoder.encode(b)),
  ]);
  return crypto.subtle.timingSafeEqual(hashA, hashB);
}

function extractCookieValue(cookieHeader: string | null, targetName: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === targetName) {
      return part.slice(eq + 1).trim();
    }
  }
  return null;
}

export function extractAccessJwt(request: Request): string | null {
  const headerToken = request.headers.get("Cf-Access-Jwt-Assertion");
  if (headerToken && headerToken.trim()) {
    return headerToken.trim();
  }
  const cookieToken = extractCookieValue(request.headers.get("Cookie"), "CF_Authorization");
  return cookieToken || null;
}

async function fetchAccessJwks(teamDomain: string, forceRefresh = false): Promise<JwksResponse> {
  const certsUrl = `https://${teamDomain}/cdn-cgi/access/certs`;
  const cache = (caches as unknown as { default?: Cache }).default;

  if (cache && !forceRefresh) {
    try {
      const cached = await cache.match(certsUrl);
      if (cached) {
        return (await cached.json()) as JwksResponse;
      }
    } catch {
      // Cache unavailable in some test harnesses; fall through to fetch
    }
  }

  const res = await fetch(certsUrl, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new HttpError(503, "Unable to retrieve Cloudflare Access signing keys.");
  }

  const bodyText = await res.text();
  let parsed: JwksResponse;
  try {
    parsed = JSON.parse(bodyText) as JwksResponse;
  } catch {
    throw new HttpError(503, "Invalid signing key response from Cloudflare Access.");
  }

  if (cache) {
    try {
      await cache.put(
        certsUrl,
        new Response(bodyText, {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": `public, max-age=${JWKS_CACHE_TTL_SECONDS}`,
          },
        }),
      );
    } catch {
      // Non-fatal cache write failure
    }
  }

  return parsed;
}

async function verifySignatureWithKeys(
  signingInput: Uint8Array,
  signature: Uint8Array,
  header: AccessJwtHeader,
  teamDomain: string,
): Promise<boolean> {
  for (const forceRefresh of [false, true]) {
    const jwks = await fetchAccessJwks(teamDomain, forceRefresh);
    const allKeys = Array.isArray(jwks.keys) ? jwks.keys : [];
    const candidates = header.kid
      ? allKeys.filter((k) => k.kid === header.kid)
      : allKeys;

    for (const jwk of candidates) {
      if (jwk.kty !== "RSA") continue;
      try {
        const key = await crypto.subtle.importKey(
          "jwk",
          jwk,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"],
        );
        const ok = await crypto.subtle.verify(
          { name: "RSASSA-PKCS1-v1_5" },
          key,
          signature,
          signingInput,
        );
        if (ok) return true;
      } catch {
        // Try next candidate key
      }
    }

    // Only retry uncached if cached response didn't contain matching kid
    if (candidates.length > 0 || forceRefresh) break;
  }
  return false;
}

export async function isEmailAdmin(email: string, adminEmailsRaw: string | undefined): Promise<boolean> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !adminEmailsRaw) return false;
  const allowlist = adminEmailsRaw
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  for (const candidate of allowlist) {
    if (await timingSafeStringEqual(normalized, candidate)) {
      return true;
    }
  }
  return false;
}

export async function verifyAccessJwt(token: string, env: Env): Promise<ViewerInfo> {
  const teamDomain = (env.CF_ACCESS_TEAM_DOMAIN || "").trim().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const policyAud = (env.POLICY_AUD || "").trim();
  if (!teamDomain || !policyAud) {
    throw new HttpError(503, "Cloudflare Access verification is not configured on the Worker yet.");
  }

  const segments = token.split(".");
  if (segments.length !== 3 || !segments[0] || !segments[1] || !segments[2]) {
    throw new HttpError(401, "Malformed Cloudflare Access token.");
  }

  const [headerB64, payloadB64, signatureB64] = segments;
  const header = decodeBase64UrlJson<AccessJwtHeader>(headerB64);
  if (header.alg !== "RS256") {
    throw new HttpError(401, "Unsupported Cloudflare Access token algorithm.");
  }

  const payload = decodeBase64UrlJson<AccessJwtPayload>(payloadB64);
  const expectedIssuer = `https://${teamDomain}`;
  if (!payload.iss || !(await timingSafeStringEqual(payload.iss.replace(/\/+$/, ""), expectedIssuer))) {
    throw new HttpError(401, "Invalid Cloudflare Access token issuer.");
  }

  const audiences = Array.isArray(payload.aud)
    ? payload.aud
    : typeof payload.aud === "string"
      ? [payload.aud]
      : [];
  let audMatched = false;
  for (const aud of audiences) {
    if (await timingSafeStringEqual(String(aud), policyAud)) {
      audMatched = true;
      break;
    }
  }
  if (!audMatched) {
    throw new HttpError(401, "Cloudflare Access token audience mismatch.");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== "number" || now > payload.exp + CLOCK_SKEW_SECONDS) {
    throw new HttpError(401, "Your Cloudflare Access session expired. Please refresh to sign in again.");
  }
  if (typeof payload.nbf === "number" && now + CLOCK_SKEW_SECONDS < payload.nbf) {
    throw new HttpError(401, "Cloudflare Access token is not valid yet.");
  }

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = decodeBase64UrlToBytes(signatureB64);
  const validSig = await verifySignatureWithKeys(signingInput, signature, header, teamDomain);
  if (!validSig) {
    throw new HttpError(401, "Invalid Cloudflare Access token signature.");
  }

  const email = (payload.email || "").trim().toLowerCase();
  if (!email) {
    throw new HttpError(401, "Cloudflare Access token did not include a user email.");
  }

  const name = (payload.name || payload.common_name || email.split("@")[0] || "").trim();
  const isAdmin = await isEmailAdmin(email, env.ADMIN_EMAILS);

  return { email, name, isAdmin };
}

export async function authenticateRequest(request: Request, env: Env): Promise<ViewerInfo> {
  const token = extractAccessJwt(request);
  if (!token) {
    throw new HttpError(401, "Cloudflare Access authentication required.");
  }
  return verifyAccessJwt(token, env);
}
