// workerjs  BullMQ worker for Groq evaluation ----------
// Run this as a separate process: node workerjs ----------
// It reads jobs queued by /api/audit/evaluates and processes them with Groq ----------
// Concurrency is set to 5: max 5 simultaneous Groq calls no matter how many are queued ----------
//  ----------
// To switch to Redis Cloud: just change REDISURL in envlocal Zero code changes needed ----------

import "dotenv/config";
import Redis from "ioredis";

// Pre-constructed ioredis client  required in ESM with BullMQ ----------
// Change REDISURL in envlocal to switch to Redis Cloud  no code changes needed ----------
const redisClient = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ ----------
  enableReadyCheck: false,    // Required for Upstash compatibility ----------
});
import { Worker } from "bullmq";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

// Supabase ----------
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Groq ----------
function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// Helpers ----------
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
    '{"overall_score":<0-10 number>,"flag":<"Clean"|"Hallucination"|"Silence"|"Interruption Failure"|"Latency System Failure"|"Transcription Failure"|"Tool Call Crash">,' +
    '"summary_insight":<string: ONE short plain-English sentence for a recruiter>,' +
    '"overall_insight":<string: 2-3 sentence detailed technical paragraph>,' +
    '"candidate_experience_insight":<string: 1-2 sentence warm description of the candidate experience. If scores are high (>=8), write an encouraging sentence about pace and comfort. If scores are low, note what could improve. Example: \'Patient pacing with natural pause allowance, giving candidates breathing room to think, elaborate, and perform at their best.\'>,' +
    '"radar_data":[' +
    '{"subject":"Latency","A":<0-10>,"insight":<string: exactly 5-6 words about overall system latency>},' +
    '{"subject":"Conversational Flow","A":<0-10>,"insight":<string: exactly 5-6 words about overall dialogue flow>},' +
    '{"subject":"Interruption","A":<0-10>,"insight":<string: exactly 5-6 words about barge-in handling>},' +
    '{"subject":"Context","A":<0-10>,"insight":<string: exactly 5-6 words about context retention>},' +
    '{"subject":"Transcription Accuracy","A":<0-10>,"insight":<string: exactly 5-6 words about transcription accuracy>},' +
    '{"subject":"Hallucination","A":<0-10>,"insight":<string: exactly 5-6 words about hallucination/factual grounding>}' +
    '],' +
    '"deductions":[{"turn_number":<number>,"time":<"MM:SS">,"type":<string>,"metric":<string>,"reason":<string>,"insight":<string>}]}\n\n' +
    "Rules for Scoring:\n" +
    "- Latency: 10 if all turn total latencies < 2000ms. Deduct for > 2500ms. Critical deduction for > 5000ms.\n" +
    "- Conversational Flow: 10 if dialogue is natural and flowing. Deduct for robotic repetition, awkward phrasing, or poor turn management.\n" +
    "- Interruption: 10 if candidate was never interrupted. Deduct for each barge-in that broke conversation flow.\n" +
    "- Context: 10 if agent remembers previous answers and asks relevant follow-ups. Deduct if it ignores user context.\n" +
    "- Transcription Accuracy: 10 if STT text is fully coherent. Deduct if garbled, misspelled, or obvious STT errors.\n" +
    "- Hallucination: 10 if agent stayed strictly factual. Deduct if it invented or fabricated any information.\n\n" +
    "Rules for summary_insight:\n" +
    "Write ONE concise plain-English sentence a recruiter can understand at a glance. Example: 'The AI listened attentively, maintained conversational context, avoided interruptions, and asked follow-ups at the correct time.'\n\n" +
    "Rules for candidate_experience_insight:\n" +
    "Write 1-2 warm sentences describing what the candidate experience felt like. If overall scores >= 8: focus on comfort, pacing, and natural flow. If scores are mixed or low: note what affected the experience. Example (high): 'Patient pacing with natural pause allowance, giving candidates breathing room to think, elaborate, and perform at their best.' Example (low): 'Some latency spikes may have felt abrupt, and the pacing occasionally disrupted the candidate\'s train of thought.'\n\n" +
    "Rules for overall_insight:\n" +
    "Write a detailed 2-3 sentence technical paragraph. Explicitly justify any low scores mentioning exact metrics (e.g. LLM latency of 4200ms). If everything was clean, praise the specific strengths observed.\n\n" +
    "Rules for pillar insight strings:\n" +
    "Each insight MUST be exactly 5-6 words. Factual. Present tense. Trailing period only. Examples: 'Retained context across all questions.' / 'One barge-in disrupted conversation flow.'\n\n" +
    "Rules for flag:\n" +
    "- 'Clean': Smooth call, high scores across the board.\n" +
    "- 'Latency System Failure': If ANY single turn latency exceeds 5000ms.\n" +
    "- 'Transcription Failure': If the user text is filled with garbled nonsense.\n" +
    "- 'Interruption Failure': If bargeIns > 3 and the agent flow completely broke down.\n" +
    "- 'Hallucination': If the agent fabricated details.\n" +
    "- 'Tool Call Crash': If a tool returned a critical error string.\n" +
    "- 'Silence': If the agent failed to respond to the user.\n\n" +
    "Empty deductions=[] if no issues.\n\n";
  if (bargeIns > 0) {
    userPrompt += "CRITICAL INSTRUCTION: THE CANDIDATE INTERRUPTED (BARGED IN) DURING THIS SESSION. Reflect this accurately in the Patient Listen score and insight.\n\n";
  }

  if (toolCallTimeline && toolCallTimeline.length > 0) {
    userPrompt += "SECOND CRITICAL INSTRUCTION: TOOL CALLS WERE MADE DURING THIS SESSION. IN YOUR `overall_insight`, YOU MUST EXPLICITLY MENTION THAT TOOL CALLS WERE EXECUTED AND EVALUATE WHETHER THEY WERE MADE AT THE CORRECT OR WRONG TIME.\n\n" +
      "THIRD CRITICAL INSTRUCTION: FOR EVERY TOOL CALL MADE, YOU MUST ADD A NEW ENTRY TO THE `deductions` ARRAY WITH \"type\": \"TOOL_PREVIEW\". Set \"turn_number\" to the turn it occurred on, \"metric\" to the EXACT tool name, and \"insight\" to a clean, 1-line human-readable summary of what the raw tool result achieved.\n\n";
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

// BullMQ Worker ----------
const worker = new Worker(
  "groq-evaluation",
  async (job) => {
    const { sessionId, sessionType, candidate_id, interview_id } = job.data;
    console.log(`[worker] Processing evaluation for session: ${sessionId} (attempt ${job.attemptsMade + 1})`);

    // Fetch merged data from Supabase (this is what was Step 35 in routejs) ----------
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

    // Run Groq evaluation ----------
    const scorecard = await runGroqEvaluation(mergedPayload);
    const { overall_score, flag, summary_insight, overall_insight, candidate_experience_insight, radar_data, deductions } = scorecard;

    // Write scorecard back to sessions table ----------
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
    concurrency: 5, // Max 5 Groq calls simultaneously  prevents rate limit errors ----------
  }
);

// Lifecycle logging ----------
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