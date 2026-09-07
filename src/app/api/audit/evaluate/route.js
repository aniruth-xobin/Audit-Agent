import { supabaseAdmin } from "@/lib/supabase";
import Groq from "groq-sdk";

export const dynamic = "force-dynamic";



// ── helpers ──────────────────────────────────────────────────────────────────

function percentile(arr, p) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

function fmtMs(ms) { return ms != null ? ms + "ms" : "N/A"; }

// ── bulk-insert helpers ───────────────────────────────────────────────────────

async function upsertTurns(sessionId, timeline) {
  if (!timeline || timeline.length === 0) return;
  const rows = timeline.map((t) => ({
    session_id:        sessionId,
    turn_index:        t.turn_index,
    timestamp_ms:      t.timestamp_ms,
    stt_latency_ms:    t.stt_ms ?? null,
    llm_ttft_ms:       t.llm_ttft_ms ?? null,
    tts_latency_ms:    t.tts_ttfb_ms ?? null,
    barge_in:          t.barge_in ?? false,
    prompt_tokens:     t.prompt_tokens ?? null,
    completion_tokens: t.completion_tokens ?? null,
  }));
  const { error } = await supabaseAdmin.from("turn_metrics").insert(rows);
  if (error) console.error("[evaluate] turn_metrics insert error:", error.message);
}

async function upsertToolCalls(sessionId, timeline) {
  if (!timeline || timeline.length === 0) return;
  const rows = timeline.map((t) => ({
    session_id:   sessionId,
    turn_index:   t.turn_index,
    timestamp_ms: t.timestamp_ms,
    tool_name:    t.tool_name,
    arguments:    typeof t.arguments === "object" ? t.arguments : { raw: String(t.arguments) },
    result:       t.result ? String(t.result).slice(0, 500) : null,
  }));
  const { error } = await supabaseAdmin.from("tool_calls").insert(rows);
  if (error) console.error("[evaluate] tool_calls insert error:", error.message);
}

async function upsertTranscripts(sessionId, transcript) {
  if (!transcript || transcript.length === 0) return;
  const rows = transcript.map((t, idx) => ({
    session_id:   sessionId,
    role:         t.role,
    text:         t.text,
    timestamp_ms: t.timestampMs ?? null,
    seq:          idx,
  }));
  const { error } = await supabaseAdmin.from("transcripts").insert(rows);
  if (error) console.error("[evaluate] transcripts insert error:", error.message);
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
    .map((t) => "[" + t.role.toUpperCase() + "]: " + t.text)
    .join("\n");

  const toolSummary = (toolCallTimeline || [])
    .map((t) => "  Turn " + t.turn_index + " - " + t.tool_name + "(" + JSON.stringify(t.arguments || {}).slice(0, 80) + ") -> " + String(t.result || "").slice(0, 80))
    .join("\n");

  const turnTable = (turnMetricsTimeline || [])
    .map((t) => "  Turn " + t.turn_index + ": STT=" + (t.stt_ms ?? "?") + "ms | LLM=" + (t.llm_ttft_ms ?? "?") + "ms | TTS=" + (t.tts_ttfb_ms ?? "?") + "ms" + (t.barge_in ? " | BARGE-IN" : ""))
    .join("\n");

  const userPrompt = "## Session ID: " + sessionId + "\n" +
    "## Mode: " + (sessionType || "guided") + "\n" +
    "## Duration: " + (durationSeconds ? Math.round(durationSeconds / 60) + " minutes" : "unknown") + "\n" +
    "## Barge-ins: " + (bargeIns ?? 0) + "\n\n" +
    "## Latency Summary\n" + latencySummary + "\n\n" +
    "## Turn-by-Turn Metrics (" + (turnMetricsTimeline?.length ?? 0) + " turns)\n" + (turnTable || "No turn data") + "\n\n" +
    "## Tool Call Timeline (" + (toolCallTimeline?.length ?? 0) + " calls)\n" + (toolSummary || "No tool calls") + "\n\n" +
    "## Transcript\n" + (transcriptText || "No transcript") + "\n\n" +
    "Return a JSON object with this exact structure:\n" +
    '{"overall_score":<0-10 number>,"flag":<"Clean"|"Hallucination"|"Silence"|"Interruption Failure">,"overall_insight":<string>,' +
    '"radar_data":[{"subject":"Latency","A":<0-10>},{"subject":"Conversational Flow","A":<0-10>},{"subject":"Interruption","A":<0-10>},{"subject":"Context","A":<0-10>},{"subject":"Guardrails","A":<0-10>}],' +
    '"deductions":[{"time":<"MM:SS">,"type":<string>,"metric":<string>,"reason":<string>,"insight":<string>}]}\n\n' +
    "Rules: bargeIns > 3 lowers Interruption. Any turn total > 2000ms adds a deduction. Empty deductions=[] if no issues.";

  const completion = await getGroq().chat.completions.create({
    model: "meta-llama/llama-4-maverick-17b-128e-instruct",
    temperature: 0.2,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: "You are an expert voice AI audit agent. Evaluate the session and return strict JSON only — no markdown." },
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

  const { sessionId, sessionType, transcript, telemetryDump, turnMetricsTimeline, toolCallTimeline } = body;
  if (!sessionId) return Response.json({ ok: false, error: "sessionId required" }, { status: 400 });

  try {
    // Step 1: Bulk inserts in parallel
    await Promise.all([
      upsertTurns(sessionId, turnMetricsTimeline),
      upsertToolCalls(sessionId, toolCallTimeline),
      upsertTranscripts(sessionId, transcript),
    ]);

    // Step 2: Update session with duration + barge-ins
    await supabaseAdmin.from("sessions").update({
      duration_secs:  telemetryDump?.durationSeconds ?? null,
      barge_in_count: telemetryDump?.bargeIns ?? 0,
      total_turns:    turnMetricsTimeline?.length ?? 0,
    }).eq("id", sessionId);

    // Step 3: Run Groq evaluation
    let scorecard;
    try {
      scorecard = await runGroqEvaluation(body);
    } catch (groqErr) {
      console.error("[evaluate] Groq error:", groqErr.message);
      return Response.json({ ok: true, warning: "Data saved, Groq failed: " + groqErr.message });
    }

    // Step 4: Write scorecard to sessions
    const { overall_score, flag, overall_insight, radar_data, deductions } = scorecard;
    await supabaseAdmin.from("sessions").update({
      overall_score, flag: flag ?? "Clean", overall_insight, radar_data, deductions,
    }).eq("id", sessionId);

    console.log("[evaluate] Session", sessionId, "-> Score:", overall_score, "Flag:", flag);
    return Response.json({ ok: true, sessionId, overall_score, flag });

  } catch (err) {
    console.error("[evaluate] Unexpected error:", err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}

