import { Redis } from "@upstash/redis";
import { supabaseAdmin } from "@/lib/supabase";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://placeholder",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder",
});

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get all session keys with pending turns
    const keys = await redis.keys("turns:*");
    let totalFlushed = 0;

    for (const key of keys) {
      const items = await redis.lrange(key, 0, -1);
      if (items.length === 0) continue;

      const rows = items.map(i => JSON.parse(i)).map(d => ({
        session_id:       d.sessionId,
        turn_index:       d.turnIndex,
        timestamp_ms:     d.timestampMs,
        stt_latency_ms:   d.sttLatency,
        llm_ttft_ms:      d.llmTtft,
        tts_latency_ms:   d.ttsLatency,
        barge_in:         d.bargeIn,
      }));

      const { error } = await supabaseAdmin.from("turn_metrics").insert(rows);
      
      if (!error) {
        await redis.del(key);
        totalFlushed += items.length;
      } else {
        console.error("Failed to insert turns for", key, error);
      }
    }

    return Response.json({ ok: true, flushedKeys: keys.length, totalFlushedItems: totalFlushed });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
