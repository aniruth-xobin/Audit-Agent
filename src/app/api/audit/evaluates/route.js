import { supabaseAdmin } from "@/lib/supabase";
import { evaluationQueue } from "@/lib/queue";
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

// Handle preflight ----------
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// session upsert (must run BEFORE child inserts) ----------

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

// bulk-insert helpers ----------

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
    // schema uses role IN (aihumansystem) and speaker IN (AgentUserSystem) ----------
    role: t.role === "agent" ? "ai" : t.role === "user" ? "human" : "system",
    speaker: t.role === "agent" ? "Agent" : t.role === "user" ? "User" : "System",
    text: t.text ?? "",
    timestamp_secs: t.timestampMs ? t.timestampMs / 1000 : null,
  }));
  const { error } = await supabaseAdmin.from("transcripts").insert(rows);
  if (error) console.error("[evaluate] transcripts insert error:", error.message);
  else console.log("[evaluate] transcripts: inserted", rows.length, "rows");
}

// main route ----------

export async function POST(req) {
  let body;
  try { body = await req.json(); }
  catch { return Response.json({ ok: false, error: "Invalid JSON" }, { status: 400 }); }

  const { sessionId, sessionType, telemetryDump, skipEvaluation } = body;
  if (!sessionId) return Response.json({ ok: false, error: "sessionId required" }, { status: 400 });

  console.log("[evaluate] Received payload for session:", sessionId);

  // Step 0: Read transcript turns and tool calls from Redis ----------
  // (Python agent pushes directly to Redis we no longer pass these in the POST body) ----------
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
  // Sort the transcript chronologically by timestamp BEFORE merging
  transcript.sort((a, b) => (a.ts || 0) - (b.ts || 0));
  // Merge consecutive transcripts of the same role unconditionally
  // If the agent didn't speak in between, it is one contiguous block of user speech.
  let mergedTranscript = [];
  for (const t of transcript) {
    const last = mergedTranscript[mergedTranscript.length - 1];
    const isSameRole = last && last.role === t.role;

    if (isSameRole) {
      // Unconditionally merge. LiveKit chunks long sentences into multiple 'final' events.
      // The time gap between 'final' events is the length of the sentence itself, which can be > 10 seconds.
      last.text += " " + t.text;
    } else {
      mergedTranscript.push({ ...t });
    }
  }
  transcript = mergedTranscript;

  try {
    // Step 1: Ensure session row exists FIRST (child rows need the FK) ----------
    await ensureSession(sessionId, sessionType, telemetryDump);

    // Step 2: Bulk inserts in parallel (safe now that session exists) ----------
    await Promise.all([
      upsertTurns(sessionId, turnMetricsTimeline),
      upsertToolCalls(sessionId, toolCallTimeline),
      upsertTranscripts(sessionId, transcript),
    ]);

    // Step 3: Update session totals ----------
    await supabaseAdmin.from("sessions").update({
      duration_secs: telemetryDump?.durationSeconds ?? null,
      barge_in_count: telemetryDump?.bargeIns ?? 0,
      total_turns: turnMetricsTimeline?.length ?? 0,
    }).eq("id", sessionId);

    if (skipEvaluation) {
      console.log("[evaluate] skipEvaluation=true. Data saved, skipping Groq.");
      return Response.json({ ok: true, sessionId, message: "Data saved, evaluation skipped" });
    }

    // Step 4: Queue the Groq evaluation job (BullMQ concurrency-limited) ----------
    await evaluationQueue.add("evaluate", { sessionId, sessionType, transcript, telemetryDump, turnMetricsTimeline, toolCallTimeline }, { removeOnComplete: true, removeOnFail: true });
    console.log("[evaluate] Job queued for session", sessionId);

        // Step 6: Cleanup Redis keys (fire and forget) ----------
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


