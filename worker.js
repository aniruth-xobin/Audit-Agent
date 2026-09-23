// worker.js — BullMQ worker for Groq evaluation
// Run this as a separate process: node worker.js
// It reads jobs queued by /api/audit/evaluates and processes them with Groq
// Concurrency is set to 5: max 5 simultaneous Groq calls no matter how many are queued
// To switch to Redis Cloud: just change REDIS_URL in .env.local — zero code changes needed

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

// Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Groq
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Helpers
function percentile(arr, p) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
function fmtMs(ms) { return ms != null ? ms + "ms" : "N/A"; }

// ============================================================================
// ACTUAL GROQ EVALUATION LOGIC
// ============================================================================
// Note: This LLM generation and prompt logic ONLY runs here in the worker.js,
// which is triggered by a background BullMQ job.
// The route.js file only inserts the initial data into the DB and queues the job,
// ensuring the main API response is fast. All LLM calls and evaluation are done here.
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

  // Build tool summary with FAILED/OK status for each call
  const toolSummary = (toolCallTimeline || [])
    .map((t) => {
      const resultStr = String(t.result || "");
      const failed = /blocked|error|failed/i.test(resultStr);
      return "  Turn " + t.turn_index + " - " + t.tool_name + "(" + JSON.stringify(t.arguments || {}).slice(0, 80) + ") -> [" + (failed ? "FAILED" : "OK") + "] " + resultStr.slice(0, 120);
    })
    .join("\n");

  // Build available tool contract (Option B: dynamic from Python agent via telemetryDump.availableTools)
  const availableTools = (telemetryDump?.availableTools || []);
  const toolContractText = availableTools.length > 0
    ? availableTools.map((t) => "  - " + t.name + ": " + t.trigger).join("\n")
    : "  No tool contract provided (freeflow or unregistered session type).";

  // Detect missing required tools
  const toolsCalledNames = (toolCallTimeline || []).map((t) => t.tool_name);
  const requiredToolNames = ["get_next_question", "end_interview"];
  const missingRequiredTools = availableTools
    .filter((t) => requiredToolNames.includes(t.name) && !toolsCalledNames.includes(t.name))
    .map((t) => "  - MISSING REQUIRED CALL: " + t.name + " (" + t.trigger + ")")
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
    "## Available Tool Contract (expected tools and their correct trigger conditions)\n" + toolContractText + "\n" +
    (missingRequiredTools ? "\n## ALERT - Missing Required Tool Calls:\n" + missingRequiredTools + "\n" : "") + "\n" +
    "## Tool Call Timeline (" + (toolCallTimeline?.length ?? 0) + " calls)\n" + (toolSummary || "No tool calls") + "\n\n" +
    "## Transcript\n" + (transcriptText || "No transcript") + "\n\n" +
    'Return ONLY a JSON object with this exact structure (no markdown, no explanation):\n' +
    '{"overall_score":<0-10 number>,"flag":<"Clean"|"Hallucination"|"Silence"|"Interruption Failure"|"Latency System Failure"|"Transcription Failure"|"Tool Call Failure"|"Tool Sequence Error">,' +
    '"summary_insight":<string: ONE short plain-English sentence for a recruiter>,' +
    '"overall_insight":<string: 2-3 sentence detailed technical paragraph>,' +
    '"candidate_experience_insight":<string: 1-2 sentence warm description of the candidate experience>,' +
    '"radar_data":[' +
    '{"subject":"Latency","A":<0-10>,"insight":<string: exactly 5-6 words about overall system latency>},' +
    '{"subject":"Conversational Flow","A":<0-10>,"insight":<string: exactly 5-6 words about overall dialogue flow>},' +
    '{"subject":"Interruption","A":<0-10>,"insight":<string: exactly 5-6 words about barge-in handling>},' +
    '{"subject":"Context","A":<0-10>,"insight":<string: exactly 5-6 words about context retention>},' +
    '{"subject":"Transcription Accuracy","A":<0-10>,"insight":<string: exactly 5-6 words about transcription accuracy>},' +
    '{"subject":"Hallucination","A":<0-10>,"insight":<string: exactly 5-6 words about hallucination/factual grounding>}' +
    '],' +
    '"deductions":[{"turn_number":<number>,"time":<"MM:SS">,"type":<"TOOL_CALL"|"HALLUCINATION"|"LATENCY"|"INTERRUPTION"|"TRANSCRIPTION"|"CONTEXT">,"metric":<string>,"reason":<string>,"insight":<string>,"tool_status":<"success"|"failed"|null>,"recovered":<true|false|null>,"recovery_turn":<number|null>,"recovery_time":<"MM:SS"|null>,"recovery_turns_taken":<number|null>}]}\n\n' +
    "Rules for Scoring:\n" +
    "- Latency: 10 if all turn total latencies < 2000ms. Deduct for > 2500ms. Critical deduction for > 5000ms.\n" +
    "- Conversational Flow: 10 if dialogue is natural and flowing. Deduct for robotic repetition, awkward phrasing, or poor turn management.\n" +
    "- Interruption: 10 if candidate was never interrupted. Deduct for each barge-in that broke conversation flow.\n" +
    "- Context: 10 if agent remembers previous answers and asks relevant follow-ups. Deduct if it ignores user context.\n" +
    "- Transcription Accuracy: 10 if STT text is fully coherent. Deduct if garbled, misspelled, or obvious STT errors.\n" +
    "- Hallucination: 10 if agent stayed strictly factual. Deduct if it invented or fabricated any information.\n\n" +
    "Rules for Tool Call Validation (CRITICAL):\n" +
    "For EVERY tool call in the Tool Call Timeline, add one entry to deductions with type=TOOL_CALL.\n" +
    "- Set tool_status='success' if the result shows [OK] AND the tool was called at the correct time per the Tool Contract.\n" +
    "- Set tool_status='failed' if: (a) result shows [FAILED]; OR (b) tool was called at wrong time; OR (c) wrong tool was used in place of expected tool.\n" +
    "- For any MISSING required tool (in ALERT section), add a deduction at turn_number=0, time='00:00', tool_status='failed', reason='Required tool was never called during the session.'\n" +
    "- TOOL_CALL entries: set recovered=null, recovery_turn=null, recovery_time=null, recovery_turns_taken=null.\n" +
    "- Never invent tool calls not in the Tool Call Timeline.\n\n" +
    "Rules for Hallucination Detection (CRITICAL):\n" +
    "- If you detect a hallucination in the transcript, add a HALLUCINATION deduction entry.\n" +
    "- Set recovered=true if the agent corrected itself or returned to factual path later in the transcript.\n" +
    "- If recovered=true: recovery_turn=turn number of correction, recovery_time=MM:SS, recovery_turns_taken=turns it took.\n" +
    "- If recovered=false: recovery_turn=null, recovery_time=null, recovery_turns_taken=null.\n" +
    "- HALLUCINATION entries: set tool_status=null.\n" +
    "- If no hallucination occurred, do NOT add a HALLUCINATION entry.\n\n" +
    "Rules for summary_insight:\n" +
    "Write ONE concise plain-English sentence a recruiter can understand at a glance.\n\n" +
    "Rules for candidate_experience_insight:\n" +
    "Write 1-2 warm sentences describing what the candidate experience felt like. If overall scores >= 8: focus on comfort, pacing, and natural flow. If scores are mixed or low: note what affected the experience.\n\n" +
    "Rules for overall_insight:\n" +
    "Write a detailed 2-3 sentence technical paragraph. Explicitly justify any low scores mentioning exact metrics. If everything was clean, praise the specific strengths observed.\n\n" +
    "Rules for pillar insight strings:\n" +
    "Each insight MUST be exactly 5-6 words. Factual. Present tense. Trailing period only.\n\n" +
    "Rules for flag:\n" +
    "- 'Clean': Smooth call, high scores, all tools called correctly.\n" +
    "- 'Latency System Failure': If ANY single turn latency exceeds 5000ms.\n" +
    "- 'Transcription Failure': If the user text is filled with garbled nonsense.\n" +
    "- 'Interruption Failure': If bargeIns > 3 and the agent flow completely broke down.\n" +
    "- 'Hallucination': If the agent fabricated details that were never corrected.\n" +
    "- 'Tool Call Failure': If any tool result was FAILED or a required tool was never called.\n" +
    "- 'Tool Sequence Error': If tools were called in the wrong order or a wrong tool used in place of another.\n" +
    "- 'Silence': If the agent failed to respond to the user.\n" +
    "- Priority order if multiple apply: Latency System Failure > Tool Call Failure > Tool Sequence Error > Hallucination > Interruption Failure > Transcription Failure > Silence > Clean.\n\n" +
    "Empty deductions=[] only if absolutely no issues detected.\n\n";

  if (bargeIns > 0) {
    userPrompt += "CRITICAL INSTRUCTION: THE CANDIDATE INTERRUPTED (BARGED IN) DURING THIS SESSION. Reflect this accurately in the Interruption score and insight.\n\n";
  }

  if (toolCallTimeline && toolCallTimeline.length > 0) {
    userPrompt += "SECOND CRITICAL INSTRUCTION: TOOL CALLS WERE MADE DURING THIS SESSION. IN YOUR `overall_insight`, YOU MUST EXPLICITLY MENTION THAT TOOL CALLS WERE EXECUTED AND EVALUATE WHETHER THEY WERE MADE AT THE CORRECT OR WRONG TIME.\n\n" +
      "THIRD CRITICAL INSTRUCTION: FOR EVERY TOOL CALL MADE, YOU MUST ADD A NEW ENTRY TO THE `deductions` ARRAY WITH \"type\": \"TOOL_CALL\". Set \"turn_number\" to the turn it occurred on, \"metric\" to the EXACT tool name, \"tool_status\" to \"success\" or \"failed\", and \"insight\" to a clean, 1-line human-readable summary of what the tool achieved or why it failed.\n\n";
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

// BullMQ Worker
const worker = new Worker(
  "groq-evaluation",
  async (job) => {
    const { sessionId, sessionType, candidate_id, interview_id } = job.data;
    console.log(`[worker] Processing evaluation for session: ${sessionId} (attempt ${job.attemptsMade + 1})`);

    // Fetch merged data from Supabase
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
    const { overall_score, flag, summary_insight, overall_insight, candidate_experience_insight, radar_data, deductions } = scorecard;

    // Write scorecard back to sessions table
    const updatePayload = {
      overall_score,
      flag: flag ?? "Clean",
      summary_insight,
      overall_insight,
      candidate_experience_insight,
      radar_data,
      deductions,
    };

    // Only update these if the Python agent provided them in the payload
    if (candidate_id) updatePayload.candidate_id = candidate_id;
    if (interview_id) updatePayload.interview_id = interview_id;

    const { error } = await supabase.from("sessions").update(updatePayload).eq("id", sessionId);

    if (error) throw new Error(`Supabase scorecard write failed: ${error.message}`);

    console.log(`[worker] Session ${sessionId} -> Score: ${overall_score} | Flag: ${flag}`);
    return { sessionId, overall_score, flag };
  },
  {
    connection: redisClient,
    concurrency: 5, // Max 5 Groq calls simultaneously — prevents rate limit errors
  }
);

// Lifecycle logging
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