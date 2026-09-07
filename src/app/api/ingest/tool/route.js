import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "https://placeholder",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "placeholder",
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId } = body;
    if (!sessionId) return Response.json({ ok: false, error: "sessionId required" }, { status: 400 });
    await redis.lpush("tool_calls:" + sessionId, JSON.stringify(body));
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
