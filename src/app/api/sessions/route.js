import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const mode = searchParams.get('mode') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const days = searchParams.get('days');

    let query = supabaseAdmin.from("sessions").select("*");

    if (days && days !== 'all') {
      const thresholdDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', thresholdDate);
    }

    if (search) {
      query = query.ilike('candidate_name', `%${search}%`);
    }

    if (mode !== 'all') {
      query = query.eq('interview_mode', mode);
    }

    if (sort === 'newest') {
      query = query.order('created_at', { ascending: false });
    } else if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'score_high') {
      query = query.order('overall_score', { ascending: false });
    } else if (sort === 'score_low') {
      query = query.order('overall_score', { ascending: true });
    }

    const { data, error } = await query;
    if (error) throw error;

    return Response.json(data);
  } catch (error) {
    console.error("Sessions API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
