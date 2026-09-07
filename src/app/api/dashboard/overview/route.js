import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [sessionsRes, turnsRes] = await Promise.all([
      supabaseAdmin.from("sessions").select("flag, interview_mode, overall_score, duration_secs, barge_in_count, total_turns, candidate_name, id, created_at").order('created_at', { ascending: false }),
      supabaseAdmin.from("turn_metrics").select("total_latency_ms")
    ]);

    if (sessionsRes.error) throw sessionsRes.error;
    if (turnsRes.error) throw turnsRes.error;

    const sessions = sessionsRes.data || [];
    const turns = turnsRes.data || [];

    // Calculations
    const cleanSessions = sessions.filter(s => s.flag === 'Clean').length;
    const systemHealth = sessions.length > 0 ? (cleanSessions / sessions.length) * 100 : 0;
    
    const hallucinationSessions = sessions.filter(s => s.flag === 'Hallucination').length;
    const hallucinationRate = sessions.length > 0 ? (hallucinationSessions / sessions.length) * 100 : 0;
    
    const totalLatency = turns.reduce((acc, curr) => acc + (curr.total_latency_ms || 0), 0);
    const avgLatencyMs = turns.length > 0 ? totalLatency / turns.length : 0;
    
    const totalBargeIn = sessions.reduce((acc, curr) => acc + (curr.barge_in_count || 0), 0);
    const avgBargeIn = sessions.length > 0 ? totalBargeIn / sessions.length : 0;
    
    const totalDurationSecs = sessions.reduce((acc, curr) => acc + (curr.duration_secs || 0), 0);
    const auditMinutes = totalDurationSecs / 60;
    
    const sumTurns = sessions.reduce((acc, curr) => acc + (curr.total_turns || 0), 0);
    const avgTurns = sessions.length > 0 ? sumTurns / sessions.length : 0;

    // Outcomes
    const outcomesCount = { 'Clean': 0, 'Hallucination': 0, 'Silence': 0, 'Interruption Failure': 0 };
    sessions.forEach(s => {
      if (outcomesCount[s.flag] !== undefined) outcomesCount[s.flag]++;
      else if (s.flag) outcomesCount[s.flag] = 1;
    });
    const sessionOutcomesData = Object.entries(outcomesCount)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));

    // Failures
    const failuresCount = {};
    let totalFailures = 0;
    sessions.forEach(s => {
      if (s.flag && s.flag !== 'Clean') {
        if (!failuresCount[s.flag]) failuresCount[s.flag] = 0;
        failuresCount[s.flag]++;
        totalFailures++;
      }
    });
    const failuresData = Object.entries(failuresCount)
      .map(([name, value]) => ({ name, value: Math.round((value / totalFailures) * 100) }));

    // Minutes by Type
    const minutesByType = {};
    sessions.forEach(s => {
      const mode = s.interview_mode || 'guided';
      if (!minutesByType[mode]) minutesByType[mode] = 0;
      minutesByType[mode] += (s.duration_secs || 0) / 60;
    });
    const minutesByTypeData = Object.entries(minutesByType).map(([name, value]) => ({ name, value }));

    // Top Candidates
    const topCandidates = [...sessions]
      .sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0))
      .slice(0, 5);

    return Response.json({
      systemHealth: systemHealth.toFixed(1),
      hallucinationRate: hallucinationRate.toFixed(1),
      avgLatency: (avgLatencyMs / 1000).toFixed(2),
      avgBargeIn: Math.round(avgBargeIn),
      auditMinutes: Math.round(auditMinutes),
      avgTurns: Math.round(avgTurns),
      sessionOutcomesData: sessionOutcomesData.length > 0 ? sessionOutcomesData : [{ name: 'No Data', value: 1 }],
      minutesByTypeData: minutesByTypeData.length > 0 ? minutesByTypeData : [{ name: 'No Data', value: 1 }],
      failuresData: failuresData.length > 0 ? failuresData : [{ name: 'No Data', value: 1 }],
      topCandidates,
      totalSessions: sessions.length
    });
  } catch (error) {
    console.error("Dashboard Overview Error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
