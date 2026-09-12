import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const mode = searchParams.get('mode') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const days = searchParams.get('days');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = 30;

    let query = supabaseAdmin.from("sessions").select("*", { count: 'exact' });
    let aggQuery = supabaseAdmin.from("sessions").select("overall_score");

    if (days && days !== 'all') {
      const thresholdDate = new Date(Date.now() - parseInt(days) * 24 * 60 * 60 * 1000).toISOString();
      query = query.gte('created_at', thresholdDate);
      aggQuery = aggQuery.gte('created_at', thresholdDate);
    }

    if (search) {
      query = query.ilike('candidate_name', `%${search}%`);
      aggQuery = aggQuery.ilike('candidate_name', `%${search}%`);
    }

    if (mode !== 'all') {
      query = query.eq('interview_mode', mode);
      aggQuery = aggQuery.eq('interview_mode', mode);
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

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const [mainRes, aggRes] = await Promise.all([query, aggQuery]);
    
    if (mainRes.error) throw mainRes.error;
    if (aggRes.error) throw aggRes.error;
    
    const validScores = aggRes.data.map(s => s.overall_score).filter(s => typeof s === 'number');
    const averageScore = validScores.length > 0 ? (validScores.reduce((a, b) => a + b, 0) / validScores.length).toFixed(1) : "0.0";

    return Response.json({
      data: mainRes.data,
      totalCount: mainRes.count,
      averageScore
    });
  } catch (error) {
    console.error("Sessions API Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
