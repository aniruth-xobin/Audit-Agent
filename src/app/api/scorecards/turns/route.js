import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");
    if (!sessionId) return Response.json({ ok: false, error: "sessionId required" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("turn_metrics")
      .select("*")
      .eq("session_id", sessionId)
      .order("turn_index", { ascending: true });

    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    return Response.json({ ok: true, data });
  } catch (err) {
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
