// feat(calendar): cancel-gcal-event — delete Google Calendar event
// Body: { eventId }. Retorna { ok: true }. Se eventId não existir → 400.

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

const OAUTH2_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar";

function b64UrlEncode(input: Uint8Array | string): string {
  const b64 = typeof input === "string" ? btoa(input) : encodeBase64(input);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64Decode(str: string): Uint8Array {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
  while (b64.length % 4) b64 += "=";
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
async function getAccessToken(clientEmail: string, privateKeyPem: string): Promise<string> {
  const pemContents = privateKeyPem.replace(/-----BEGIN PRIVATE KEY-----/i, "").replace(/-----END PRIVATE KEY-----/i, "").replace(/\s/g, "");
  const key = await crypto.subtle.importKey("pkcs8", b64Decode(pemContents), { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const toSign = `${b64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64UrlEncode(JSON.stringify({ iss: clientEmail, scope: CALENDAR_SCOPE, aud: OAUTH2_TOKEN_URL, iat: now, exp: now + 3600 }))}`;
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(toSign));
  const jwt = `${toSign}.${b64UrlEncode(new Uint8Array(sig))}`;
  const res = await fetch(OAUTH2_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }).toString() });
  if (!res.ok) throw new Error("Falha ao obter token Google");
  return (await res.json()).access_token;
}

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const eventId = body?.eventId;

    if (!eventId || typeof eventId !== "string" || eventId.trim() === "") {
      console.warn("[gcal] cancel: eventId obrigatório");
      return new Response(
        JSON.stringify({ ok: false, error: "eventId é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientEmail = Deno.env.get("GCAL_CLIENT_EMAIL");
    let privateKey = Deno.env.get("GCAL_PRIVATE_KEY");
    const calendarId = Deno.env.get("GCAL_CALENDAR_ID");

    if (!clientEmail || !privateKey || !calendarId) {
      console.error("[gcal] cancel: secrets não configurados");
      return new Response(
        JSON.stringify({ ok: false, error: "Configuração Google Calendar ausente" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    privateKey = privateKey.replace(/\\n/g, "\n");
    const accessToken = await getAccessToken(clientEmail, privateKey);

    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId.trim())}/events/${encodeURIComponent(eventId.trim())}`;
    const res = await fetch(url, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (res.status === 404) {
      console.warn("[gcal] cancel: evento não encontrado", eventId);
      return new Response(
        JSON.stringify({ ok: false, error: "Evento não encontrado no Google Calendar" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("[gcal] cancel: API error", res.status, errText.slice(0, 300));
      return new Response(
        JSON.stringify({ ok: false, error: "Falha ao cancelar evento", details: errText.slice(0, 200) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[gcal] cancel: ok", eventId);
    return new Response(
      JSON.stringify({ ok: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[gcal] cancel: exception", e?.message ?? String(e));
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
