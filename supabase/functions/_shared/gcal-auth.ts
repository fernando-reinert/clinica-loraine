// Shared Google Calendar auth for Edge Functions (service account JWT -> access token)

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const OAUTH2_TOKEN_URL = "https://oauth2.googleapis.com/token";

export function base64UrlEncode(input: Uint8Array | string): string {
  const str = typeof input === "string" ? input : new TextDecoder().decode(input);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64Decode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const pemContents = privateKeyPem
    .replace(/-----BEGIN PRIVATE KEY-----/i, "")
    .replace(/-----END PRIVATE KEY-----/i, "")
    .replace(/\s/g, "");
  const keyBinary = base64Decode(pemContents);

  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyBinary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const now = Math.floor(Date.now() / 1000);
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payloadB64 = base64UrlEncode(JSON.stringify({
    iss: clientEmail,
    scope: CALENDAR_SCOPE,
    aud: OAUTH2_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const toSign = `${headerB64}.${payloadB64}`;

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(toSign)
  );
  const jwt = `${toSign}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch(OAUTH2_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[gcal] OAuth2 token error:", tokenRes.status, errText.slice(0, 200));
    throw new Error("Falha ao obter token Google");
  }
  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}
