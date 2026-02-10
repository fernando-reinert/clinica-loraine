// feat(calendar): create-gcal-event — create Google Calendar event via Service Account
// Secrets: GCAL_CLIENT_EMAIL, GCAL_PRIVATE_KEY, GCAL_CALENDAR_ID (Supabase Edge secrets only)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { encodeBase64 } from "https://deno.land/std@0.224.0/encoding/base64.ts";

function ensureBase64Polyfill() {
  if (!globalThis.btoa) {
    globalThis.btoa = (data: string) => encodeBase64(new TextEncoder().encode(data));
  } else {
    globalThis.btoa = (data: string) => encodeBase64(new TextEncoder().encode(data));
  }
  if (!globalThis.atob) {
    globalThis.atob = (b64: string) => {
      let b64norm = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
      while (b64norm.length % 4) b64norm += "=";
      const bytes = rawBase64Decode(b64norm);
      return String.fromCharCode.apply(null, bytes as unknown as number[]);
    };
  } else {
    globalThis.atob = (b64: string) => {
      let b64norm = b64.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
      while (b64norm.length % 4) b64norm += "=";
      const bytes = rawBase64Decode(b64norm);
      return String.fromCharCode.apply(null, bytes as unknown as number[]);
    };
  }
}

const BASE64_ABC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
function rawBase64Decode(b64: string): Uint8Array {
  const len = b64.length;
  let pad = 0;
  if (len >= 2 && b64[len - 1] === "=") pad++;
  if (len >= 1 && b64[len - 2] === "=") pad++;
  const outLen = Math.floor((len * 3) / 4) - pad;
  const out = new Uint8Array(outLen);
  let i = 0;
  let j = 0;
  while (i < len - (pad ? 2 : 0)) {
    const a = BASE64_ABC.indexOf(b64[i++] ?? "");
    const b = BASE64_ABC.indexOf(b64[i++] ?? "");
    const c = BASE64_ABC.indexOf(b64[i++] ?? "");
    const d = BASE64_ABC.indexOf(b64[i++] ?? "");
    if (a < 0 || b < 0 || c < 0 || d < 0) break;
    out[j++] = (a << 2) | (b >> 4);
    if (j < outLen) out[j++] = ((b & 15) << 4) | (c >> 2);
    if (j < outLen) out[j++] = ((c & 3) << 6) | d;
  }
  return out;
}

ensureBase64Polyfill();

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";
const OAUTH2_TOKEN_URL = "https://oauth2.googleapis.com/token";

function base64UrlEncode(input: Uint8Array | string): string {
  const b64 = typeof input === "string" ? btoa(input) : encodeBase64(input);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function latin1Safe(input: string): string {
  const asString = (input ?? "").toString();
  // Remove diacríticos (acentos) e depois qualquer caractere fora de Latin1 (inclui emoji)
  const noDiacritics = asString.normalize("NFD").replace(/\p{Diacritic}/gu, "");
  return noDiacritics.replace(/[^\x00-\xFF]/g, "").trim();
}

function base64Decode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
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
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: clientEmail,
    scope: CALENDAR_SCOPE,
    aud: OAUTH2_TOKEN_URL,
    iat: now,
    exp: now + 3600,
  };

  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const toSign = `${headerB64}.${payloadB64}`;
  const toSignBytes = new TextEncoder().encode(toSign);

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    toSignBytes
  );
  const jwt = `${toSign}.${base64UrlEncode(new Uint8Array(signature))}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const tokenRes = await fetch(OAUTH2_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    console.error("[gcal] OAuth2 token error:", tokenRes.status, errText.slice(0, 200));
    throw new Error("Falha ao obter token Google");
  }

  const tokenJson = await tokenRes.json();
  return tokenJson.access_token;
}

function toRfc3339(isoOrLocal: string, timeZone: string = "America/Sao_Paulo"): string {
  const d = new Date(isoOrLocal);
  if (Number.isNaN(d.getTime())) throw new Error("Data/hora inválida: " + isoOrLocal);
  return d.toISOString();
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any = null;

  try {
    body = await req.json();
    const { patientName, start, end, appointmentId, notes, description } = body ?? {};

    if (!patientName || typeof patientName !== "string" || !start || !end) {
      console.warn("[gcal] create: body inválido (patientName, start, end obrigatórios)");
      return new Response(
        JSON.stringify({ ok: false, error: "Body inválido: patientName, start e end são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientEmail = Deno.env.get("GCAL_CLIENT_EMAIL");
    let privateKey = Deno.env.get("GCAL_PRIVATE_KEY");
    const calendarId = Deno.env.get("GCAL_CALENDAR_ID");

    if (!clientEmail || !privateKey || !calendarId) {
      console.error("[gcal] create: secrets não configurados (GCAL_*)");
      return new Response(
        JSON.stringify({ ok: false, error: "Configuração Google Calendar ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    privateKey = privateKey.replace(/\\n/g, "\n");

    const accessToken = await getAccessToken(clientEmail, privateKey);

    const startRfc = toRfc3339(start);
    const endRfc = toRfc3339(end);
    const safeName = latin1Safe(patientName);
    const safeDescription = latin1Safe((notes ?? description ?? "") as string);
    const summary = `Consulta - ${safeName}`;

    const eventBody = {
      summary,
      start: { dateTime: startRfc, timeZone: "America/Sao_Paulo" },
      end: { dateTime: endRfc, timeZone: "America/Sao_Paulo" },
      description: safeDescription,
    };

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId.trim())}/events`;
    const eventRes = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(eventBody),
    });

    if (!eventRes.ok) {
      const errText = await eventRes.text();
      console.error("[gcal] create: Calendar API error:", eventRes.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ ok: false, error: "Falha ao criar evento no Google Calendar", details: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const event = await eventRes.json();
    const eventId = event?.id ?? null;
    const htmlLink = event?.htmlLink ?? null;

    console.log("[gcal] create: ok", {
      eventId: eventId ? "set" : "null",
      appointmentId: appointmentId ?? "n/a",
      summaryPreview: safeName.slice(0, 40),
    });

    return new Response(
      JSON.stringify({ ok: true, eventId, htmlLink }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    let bodyKeys: string[] | null = null;
    let fieldLengths: Record<string, number | null> | null = null;
    if (body && typeof body === "object") {
      bodyKeys = Object.keys(body as Record<string, unknown>);
      fieldLengths = {};
      for (const [k, v] of Object.entries(body as Record<string, unknown>)) {
        fieldLengths[k] = typeof v === "string" ? v.length : null;
      }
    }

    console.error("[gcal] create: exception", {
      message: (e as any)?.message ?? String(e),
      bodyKeys,
      fieldLengths,
    });

    return new Response(
      JSON.stringify({ ok: false, error: (e as any)?.message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
