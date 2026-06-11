// Cloudflare Worker — a tiny backend that keeps your Gemini API key secret.
//
// Your webpage sends its request here instead of to Google directly.
// This worker adds the secret key (stored safely on Cloudflare, never in the
// page) and forwards the request to Gemini, then returns Gemini's answer.
//
// SETUP (in the Cloudflare dashboard):
//   1. Paste this code into your Worker.
//   2. Add a SECRET variable named  GEMINI_KEY  with your Gemini API key.
//   3. Deploy, then copy the worker URL (like https://c-tutor.<you>.workers.dev).

const MODEL = "gemini-2.5-flash";

export default {
  async fetch(request, env) {
    // Headers that let your webpage (on a different domain) call this worker.
    const cors = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Browsers send a preflight "OPTIONS" check first — answer it.
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }
    if (request.method !== "POST") {
      return new Response("Use POST", { status: 405, headers: cors });
    }

    // Build the Gemini URL using the SECRET key (from Cloudflare, not the page).
    const url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      MODEL +
      ":generateContent?key=" +
      env.GEMINI_KEY;

    // Forward the webpage's request body straight to Gemini.
    const incomingBody = await request.text();
    const geminiRes = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: incomingBody,
    });

    // Send Gemini's answer back to the webpage (with CORS headers).
    const answer = await geminiRes.text();
    return new Response(answer, {
      status: geminiRes.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  },
};
