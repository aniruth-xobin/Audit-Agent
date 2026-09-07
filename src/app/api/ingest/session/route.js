import { Redis } from "@upstash/redis";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req) {
  try {
    const body = await req.json();
    const { sessionId, candidateName, jobRole, interviewMode, organisation } = body;

    // Write session row immediately
    const { error } = await supabaseAdmin.from("sessions").insert({
      id: sessionId,
      candidate_name: candidateName,
      job_role: jobRole,
      interview_mode: interviewMode,
      organisation,
      started_at: new Date().toISOString(),
    });

    if (error) {
      console.error("Failed to insert session:", error);
      return Response.json({ ok: false, error: error.message }, { status: 500 });
    }

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
