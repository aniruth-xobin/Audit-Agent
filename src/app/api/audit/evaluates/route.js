import { supabaseAdmin } from "@/lib/supabase";
import { evaluationQueue } from "@/lib/queue";
import Groq from "groq-sdk";
import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle preflight
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ── helpers ───────────────────────────────────────────────────────────────────

function percentile(arr, p) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
function fmtMs(ms) { return ms != null ? ms + "ms" : "N/A"; }

// ── session upsert (must run BEFORE child inserts) ───────────────────────────

async function ensureSession(sessionId, sessionType, telemetryDump) {
  const { error } = await supabaseAdmin.from("sessions").upsert({
    id: sessionId,
    candidate_name: telemetryDump?.candidateName || "Unknown",
    job_role: telemetryDump?.jobRole || null,
    organisation: telemetryDump?.organisation || null,
    interview_mode: (["guided", "freeflow", "roleplay"].includes(sessionType) ? sessionType : "guided"),
    duration_secs: telemetryDump?.durationSeconds ?? null,
    barge_in_count: telemetryDump?.bargeIns ?? 0,
  }, { onConflict: "id", ignoreDuplicates: false });
  if (error) console.error("[evaluate] session upsert error:", error.message);
}

// ── bulk-insert helpers ───────────────────────────────────────────────────────

async function upsertTurns(sessionId, timeline) {
  if (!timeline || timeline.length === 0) return;
  const rows = timeline.map((t) => ({
    session_id: sessionId,
    turn_index: t.turn_index,
    timestamp_ms: t.timestamp_ms ?? Date.now(),
    stt_latency_ms: t.stt_ms ?? null,
    llm_ttft_ms: t.llm_ttft_ms ?? null,
    tts_latency_ms: t.tts_ttfb_ms ?? null,
    barge_in: t.barge_in ?? false,
  }));
  const { error } = await supabaseAdmin.from("turn_metrics").insert(rows);
  if (error) console.error("[evaluate] turn_metrics insert error:", error.message);
  else console.log("[evaluate] turn_metrics: inserted", rows.length, "rows");
}

async function upsertToolCalls(sessionId, timeline) {
  if (!timeline || timeline.length === 0) return;
  const rows = timeline.map((t) => ({
    session_id: sessionId,
    turn_index: t.turn_index,
    timestamp_ms: t.timestamp_ms ?? Date.now(),
    tool_name: t.tool_name,
    arguments: typeof t.arguments === "object" ? t.arguments : { raw: String(t.arguments) },
    result: t.result ? String(t.result).slice(0, 500) : null,
  }));
  const { error } = await supabaseAdmin.from("tool_calls").insert(rows);
  if (error) console.error("[evaluate] tool_calls insert error:", error.message);
  else console.log("[evaluate] tool_calls: inserted", rows.length, "rows");
}

async function upsertTranscripts(sessionId, transcript) {
  if (!transcript || transcript.length === 0) return;
  const rows = transcript.map((t) => ({
    session_id: sessionId,
    // schema uses role IN ('ai','human','system') and speaker IN ('Agent','User','System')
    role: t.role === "agent" ? "ai" : t.role === "user" ? "human" : "system",
    speaker: t.role === "agent" ? "Agent" : t.role === "user" ? "User" : "System",
    text: t.text ?? "",
    timestamp_secs: t.timestampMs ? t.timestampMs / 1000 : null,
  }));
  const { error } = await supabaseAdmin.from("transcripts").insert(rows);
  if (error) console.error("[evaluate] transcripts insert error:", error.message);
  else console.log("[evaluate] transcripts: inserted", rows.length, "rows");
}

// ── Groq evaluation ───────────────────────────────────────────────────────────

async function runGroqEvaluation(payload) {
  const { sessionId, sessionType, transcript, telemetryDump, turnMetricsTimeline, toolCallTimeline } = payload;
  const { stt_latency, server_llm_ttft, tts_latency, bargeIns, durationSeconds } = telemetryDump || {};

  const totals = (turnMetricsTimeline || [])
    .map((t) => (t.stt_ms ?? 0) + (t.llm_ttft_ms ?? 0) + (t.tts_ttfb_ms ?? 0))
    .filter(Boolean);

  const latencySummary = totals.length > 0
    ? "Avg: " + Math.round(totals.reduce((a, b) => a + b, 0) / totals.length) + "ms | " +
    "P50: " + fmtMs(percentile(totals, 50)) + " | " +
    "P90: " + fmtMs(percentile(totals, 90)) + " | " +
    "P99: " + fmtMs(percentile(totals, 99))
    : "STT avg: " + fmtMs(stt_latency) + " | LLM TTFT avg: " + fmtMs(server_llm_ttft) + " | TTS avg: " + fmtMs(tts_latency);

  const transcriptText = (transcript || []).slice(0, 60)
    .map((t) => "[" + (t.role || "?").toUpperCase() + "]: " + t.text)
    .join("\n");

  const toolSummary = (toolCallTimeline || [])
    .map((t) => "  Turn " + t.turn_index + " - " + t.tool_name + "(" + JSON.stringify(t.arguments || {}).slice(0, 80) + ") -> " + String(t.result || "").slice(0, 80))
    .join("\n");

  const turnTable = (turnMetricsTimeline || [])
    .map((t) => "  Turn " + t.turn_index + ": STT=" + (t.stt_ms ?? "?") + "ms | LLM=" + (t.llm_ttft_ms ?? "?") + "ms | TTS=" + (t.tts_ttfb_ms ?? "?") + "ms" + (t.barge_in ? " | BARGE-IN" : ""))
    .join("\n");

  const userPrompt =
    "## Session ID: " + sessionId + "\n" +
    "## Mode: " + (sessionType || "guided") + "\n" +
    "## Duration: " + (durationSeconds ? Math.round(durationSeconds / 60) + " minutes" : "unknown") + "\n" +
    "## Barge-ins: " + (bargeIns ?? 0) + "\n\n" +
    "## Latency Summary\n" + latencySummary + "\n\n" +
    "## Turn-by-Turn Metrics (" + (turnMetricsTimeline?.length ?? 0) + " turns)\n" + (turnTable || "No turn data") + "\n\n" +
    "## Tool Call Timeline (" + (toolCallTimeline?.length ?? 0) + " calls)\n" + (toolSummary || "No tool calls") + "\n\n" +
    "## Transcript\n" + (transcriptText || "No transcript") + "\n\n" +
    'Return ONLY a JSON object with this exact structure (no markdown, no explanation):\n' +
    '{"overall_score":<0-10 number>,"flag":<"Clean"|"Hallucination"|"Silence"|"Interruption Failure"|"Latency System Failure"|"Transcription Failure"|"Tool Call Crash">,"overall_insight":<string>,' +
    '"radar_data":[{"subject":"Latency","A":<0-10>},{"subject":"Conversational Flow","A":<0-10>},{"subject":"Interruption","A":<0-10>},{"subject":"Context","A":<0-10>},{"subject":"Transcription Accuracy","A":<0-10>},{"subject":"Hallucination","A":<0-10>}],' +
    '"deductions":[{"turn_number":<number>,"time":<"MM:SS">,"type":<string>,"metric":<string>,"reason":<string>,"insight":<string>}]}\n\n' +
    "Rules: bargeIns > 3 lowers Interruption score. Turn total latency <= 2000ms is good, up to 2500ms is normal. Any turn total latency > 2500ms adds a latency deduction. If ANY turn latency > 5000ms, set flag to \"Latency System Failure\". If the transcript is filled with completely garbled STT text or major speech-to-text failures, set flag to \"Transcription Failure\". If any tool calls failed to execute or returned critical error strings, set flag to \"Tool Call Crash\". Empty deductions=[] if no issues. IMPORTANT: For 'overall_insight', write a comprehensive 2-3 sentence paragraph that explicitly summarizes the session, evaluating the AI's conversational context, any hallucinations, transcription accuracy, and whether the tool calls made were appropriate for the scenario.";

  const completion = await getGroq().chat.completions.create({
    model: "openai/gpt-oss-120b",
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are an expert voice AI audit agent. Evaluate the session and return strict JSON only - no markdown." },
      { role: "user", content: userPrompt },
    ],
  });

  return JSON.parse(completion.choices[0]?.message?.content || "{}");
}

// ── main route ────────────────────────────────────────────────────────────────

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { sessionId, sessionType, telemetryDump, skipEvaluation } = body;
  if (!sessionId) return Response.json({ ok: false, error: "sessionId required" }, { status: 400 });

  console.log("[evaluate] Received payload for session:", sessionId);

  // Step 0: Read transcript, turns, and tool calls from Redis
  // (Python agent pushes directly to Redis; we no longer pass these in the POST body)
  let transcript = [], turnMetricsTimeline = [], toolCallTimeline = [];
  try {
    const [rTranscript, rTurns, rTools] = await Promise.all([
      redis.lrange(`session:${sessionId}:transcript`, 0, -1),
      redis.lrange(`session:${sessionId}:turns`, 0, -1),
      redis.lrange(`session:${sessionId}:tools`, 0, -1),
    ]);
    transcript        = (rTranscript || []).map(i => typeof i === "string" ? JSON.parse(i) : i);
    turnMetricsTimeline = (rTurns    || []).map(i => typeof i === "string" ? JSON.parse(i) : i);
    toolCallTimeline    = (rTools    || []).map(i => typeof i === "string" ? JSON.parse(i) : i);
    console.log(`[evaluate] Redis read -> transcript:${transcript.length} turns:${turnMetricsTimeline.length} tools:${toolCallTimeline.length}`);
  } catch (redisErr) {
    console.warn("[evaluate] Redis read failed:", redisErr.message);
  }

  try {
    // Step 1: Ensure session row exists FIRST (child rows need the FK)
    await ensureSession(sessionId, sessionType, telemetryDump);

    // Step 2: Bulk inserts in parallel (safe now that session exists)
    await Promise.all([
      upsertTurns(sessionId, turnMetricsTimeline),
      upsertToolCalls(sessionId, toolCallTimeline),
      upsertTranscripts(sessionId, transcript),
    ]);

    // Step 3: Update session totals
    await supabaseAdmin.from("sessions").update({
      duration_secs: telemetryDump?.durationSeconds ?? null,
      barge_in_count: telemetryDump?.bargeIns ?? 0,
      total_turns: turnMetricsTimeline?.length ?? 0,
    }).eq("id", sessionId);

    if (skipEvaluation) {
      console.log("[evaluate] skipEvaluation=true. Data saved, skipping Groq.");
      return Response.json({ ok: true, sessionId, message: "Data saved, evaluation skipped" });
    }

    // Step 4: Queue the Groq evaluation job (BullMQ, concurrency-limited)
    await evaluationQueue.add("evaluate", { sessionId, sessionType, transcript, telemetryDump, turnMetricsTimeline, toolCallTimeline });
    console.log("[evaluate] Job queued for session", sessionId);

        // Step 6: Cleanup Redis keys (fire and forget)
    Promise.allSettled([
      redis.del(`session:` + sessionId + `:turns`),
      redis.del(`session:` + sessionId + `:transcript`),
      redis.del(`session:` + sessionId + `:tools`),
    ]).then(() => console.log('[evaluate] Redis keys cleaned for session', sessionId))
      .catch(err2 => console.warn('[evaluate] Redis cleanup failed:', err2.message));

    return Response.json({ ok: true, sessionId, queued: true });

  } catch (err) {
    console.error("[evaluate] Unexpected error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

