import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    if (!sessionId) return Response.json({ error: "No sessionId provided" }, { status: 400 });

    const { data, error } = await supabaseAdmin
      .from("transcripts")
      .select("*")
      .eq('session_id', sessionId)
      .order('turn_number', { ascending: true });

    if (error) throw error;

    return Response.json(data || []);
  } catch (error) {
    console.error("Transcript API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
