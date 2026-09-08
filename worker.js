// worker.js — BullMQ worker for Groq evaluation
// Run this as a separate process: node worker.js
// It reads jobs queued by /api/audit/evaluates and processes them with Groq.
// Concurrency is set to 5: max 5 simultaneous Groq calls, no matter how many are queued.
//
// To switch to Redis Cloud: just change REDIS_URL in .env.local. Zero code changes needed.

import "dotenv/config";
import Redis from "ioredis";

// Pre-constructed ioredis client — required in ESM with BullMQ
// Change REDIS_URL in .env.local to switch to Redis Cloud — no code changes needed
const redisClient = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,    // Required for Upstash compatibility
});
import { Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Groq ─────────────────────────────────────────────────────────────────────
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function percentile(arr, p) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
function fmtMs(ms) { return ms != null ? ms + "ms" : "N/A"; }

// ─── Groq Evaluation (same prompt logic as original route.js) ─────────────────
async function runGroqEvaluation(payload) {
  const { sessionId, sessionType, transcript, telemetryDump, turnMetricsTimeline, toolCallTimeline } = payload;
  const { stt_latency, server_llm_ttft, tts_latency, bargeIns, durationSeconds } = telemetryDump || {};

  const totals = (turnMetricsTimeline || [])
    .map((t) => (t.stt_ms ?? t.stt_latency_ms ?? 0) + (t.llm_ttft_ms ?? 0) + (t.tts_ttfb_ms ?? t.tts_latency_ms ?? 0))
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
    .map((t) => "  Turn " + t.turn_index + ": STT=" + (t.stt_ms ?? t.stt_latency_ms ?? "?") + "ms | LLM=" + (t.llm_ttft_ms ?? "?") + "ms | TTS=" + (t.tts_ttfb_ms ?? t.tts_latency_ms ?? "?") + "ms" + (t.barge_in ? " | BARGE-IN" : ""))
    .join("\n");

  let userPrompt =
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
    "Rules: Turn total latency <= 2000ms is good, up to 2500ms is normal. Any turn total latency > 2500ms adds a latency deduction. If ANY turn latency > 5000ms, set flag to \"Latency System Failure\". If the transcript is filled with completely garbled STT text or major speech-to-text failures, set flag to \"Transcription Failure\". Empty deductions=[] if no issues.\n\n";

  if (bargeIns > 0) {
    userPrompt += "CRITICAL INSTRUCTION: THE CANDIDATE INTERRUPTED (BARGED IN) DURING THIS SESSION. YOUR `overall_insight` MUST BEGIN WITH A SENTENCE EXPLICITLY EVALUATING HOW GRACEFULLY THE AGENT HANDLED THE INTERRUPTION.\n\n";
  } else {
    userPrompt += "CRITICAL INSTRUCTION: Write a 3 sentence paragraph for `overall_insight` evaluating conversational context, hallucinations, transcription accuracy, and tool usage.\n\n";
  }

  if (toolCallTimeline && toolCallTimeline.length > 0) {
    userPrompt += "SECOND CRITICAL INSTRUCTION: TOOL CALLS WERE MADE DURING THIS SESSION. IN YOUR `overall_insight`, YOU MUST EXPLICITLY MENTION THAT TOOL CALLS WERE EXECUTED AND EVALUATE WHETHER THEY WERE MADE AT THE CORRECT OR WRONG TIME.\n\n";
  } else {
    userPrompt += "SECOND CRITICAL INSTRUCTION: NO TOOL CALLS WERE MADE DURING THIS SESSION. IN YOUR `overall_insight`, YOU MUST EXPLICITLY STATE THAT NO TOOL CALLS WERE MADE AND EVALUATE WHETHER IT WAS APPROPRIATE FOR THIS INTERVIEW SCENARIO NOT TO HAVE ANY.\n\n";
  }

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

// ─── BullMQ Worker ────────────────────────────────────────────────────────────
const worker = new Worker(
  "groq-evaluation",
  async (job) => {
    const { sessionId, sessionType } = job.data;
    console.log(`[worker] Processing evaluation for session: ${sessionId} (attempt ${job.attemptsMade + 1})`);

    // Fetch merged data from Supabase (this is what was Step 3.5 in route.js)
    const [{ data: dbTurns }, { data: dbTools }, { data: dbTranscripts }] = await Promise.all([
      supabase.from("turn_metrics").select("*").eq("session_id", sessionId).order("turn_index", { ascending: true }),
      supabase.from("tool_calls").select("*").eq("session_id", sessionId).order("turn_index", { ascending: true }),
      supabase.from("transcripts").select("*").eq("session_id", sessionId).order("id", { ascending: true }),
    ]);

    const mergedPayload = {
      sessionId,
      sessionType,
      telemetryDump: job.data.telemetryDump || {},
      turnMetricsTimeline: dbTurns || [],
      toolCallTimeline: dbTools || [],
      transcript: (dbTranscripts || []).map((t) => ({
        role: t.role === "ai" ? "agent" : t.role === "human" ? "user" : "system",
        text: t.text,
      })),
    };

    // Run Groq evaluation
    const scorecard = await runGroqEvaluation(mergedPayload);
    const { overall_score, flag, overall_insight, radar_data, deductions } = scorecard;

    // Write scorecard back to sessions table
    const { error } = await supabase.from("sessions").update({
      overall_score,
      flag: flag ?? "Clean",
      overall_insight,
      radar_data,
      deductions,
    }).eq("id", sessionId);

    if (error) throw new Error(`Supabase scorecard write failed: ${error.message}`);

    console.log(`[worker] ✓ Session ${sessionId} -> Score: ${overall_score} | Flag: ${flag}`);
    return { sessionId, overall_score, flag };
  },
  {
    connection: redisClient,
    concurrency: 5, // Max 5 Groq calls simultaneously — prevents rate limit errors
  }
);

// ─── Lifecycle logging ─────────────────────────────────────────────────────────
worker.on("completed", (job, result) => {
  console.log(`[worker] Job ${job.id} completed:`, result);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
});

worker.on("error", (err) => {
  console.error("[worker] Worker error:", err);
});

console.log("[worker] BullMQ Groq evaluation worker started. Concurrency: 5. Waiting for jobs...");