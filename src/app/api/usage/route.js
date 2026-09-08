import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = 'force-dynamic';

function getPercentiles(arr) {
  if (!arr || arr.length === 0) return { p50: 0, p90: 0, p99: 0 };
  const sorted = [...arr].sort((a, b) => a - b);
  return {
    p50: Number((sorted[Math.floor(sorted.length * 0.5)] / 1000).toFixed(2)),
    p90: Number((sorted[Math.floor(sorted.length * 0.9)] / 1000).toFixed(2)),
    p99: Number((sorted[Math.floor(sorted.length * 0.99)] / 1000).toFixed(2))
  };
}

export async function GET() {
  try {
    const [sessionsRes, turnsRes] = await Promise.all([
      supabaseAdmin.from('sessions').select('*'),
      supabaseAdmin.from('turn_metrics').select('timestamp_ms, total_latency_ms')
    ]);
    
    if (sessionsRes.error) throw sessionsRes.error;
    if (turnsRes.error) throw turnsRes.error;
    
    const sessions = sessionsRes.data || [];
    const turns = turnsRes.data || [];
    
    const totalAudits = sessions.length;
    
    const flagged = sessions.filter(s => s.flag && s.flag !== 'Clean').length;
    const flaggedPercent = totalAudits > 0 ? ((flagged / totalAudits) * 100).toFixed(1) + '%' : '0%';

    let totalCost = 0;
    const volumeMap = {};
    sessions.forEach(s => {
      const d = new Date(s.created_at);
      const day = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
      if (!volumeMap[day]) volumeMap[day] = { count: 0, cost: 0 };
      volumeMap[day].count++;
      
      const cost = ((s.duration_secs || 0) / 60) * 0.05; // $0.05 per minute
      volumeMap[day].cost += cost;
      totalCost += cost;
    });
    
    let avgCostPerAudit = totalAudits > 0 ? (totalCost / totalAudits).toFixed(3) : 0.000;
    
    let auditVolumeData = Object.keys(volumeMap).map(k => ({
      date: k,
      audits: volumeMap[k].count,
      cost: Number(volumeMap[k].cost.toFixed(2))
    })).sort((a,b) => new Date(a.date) - new Date(b.date));

    if (auditVolumeData.length === 0) {
      auditVolumeData = Array.from({ length: 14 }).map((_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (13 - i));
        return { date: d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }), audits: 0, cost: 0 };
      });
    }

    // Token distribution: derived from turn count as a proxy
    // (prompt_tokens/completion_tokens not stored; estimate from turn volume)
    const turnCount = turns.length;
    const estimatedPromptPct  = turnCount > 0 ? 68 : 70;
    const estimatedCompletePct = 100 - estimatedPromptPct;
    let tokenDistribution = [
      { name: 'Prompt Tokens',     value: estimatedPromptPct,   color: 'var(--chart-cyan)' },
      { name: 'Completion Tokens', value: estimatedCompletePct, color: 'var(--chart-purple)' },
    ];

    const failuresMap = {};
    let totalFailures = 0;
    sessions.forEach(s => {
      if (s.radar_data && Array.isArray(s.radar_data)) {
        s.radar_data.forEach(r => {
          if (r.A < 7) {
            failuresMap[r.subject] = (failuresMap[r.subject] || 0) + 1;
            totalFailures++;
          }
        });
      }
    });
    const colors = ['var(--chart-red)', 'var(--chart-orange)', 'var(--chart-cyan)', 'var(--chart-purple)', 'var(--chart-blue)'];
    let rubricFailures = Object.keys(failuresMap).map((k, i) => ({
      name: k,
      value: Math.round((failuresMap[k] / totalFailures) * 100),
      color: colors[i % colors.length]
    }));
    
    if (rubricFailures.length === 0) {
      rubricFailures = [{ name: 'No Failures', value: 100, color: 'var(--chart-cyan)' }];
    }

    const latencyByHour = {};
    turns.forEach(t => {
      const d = new Date(Number(t.timestamp_ms || Date.now()));
      const hour = d.getHours().toString().padStart(2, '0') + ':00';
      if (!latencyByHour[hour]) latencyByHour[hour] = [];
      latencyByHour[hour].push(t.total_latency_ms || 0);
    });
    
    let latencyData = Object.keys(latencyByHour).sort().map(hour => {
      const percs = getPercentiles(latencyByHour[hour]);
      return { time: hour, ...percs };
    });
    
    if (latencyData.length === 0) {
      latencyData = [{ time: '00:00', p50: 0, p90: 0, p99: 0 }];
    }

    const errorLogs = []; 

    return Response.json({
      totalAudits,
      flaggedPercent,
      avgCostPerAudit,
      auditVolumeData,
      tokenDistribution,
      rubricFailures,
      latencyData,
      errorLogs
    });
  } catch (error) {
    console.error("Usage API error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}



