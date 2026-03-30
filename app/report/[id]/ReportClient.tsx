'use client';

import { SessionReport, PreviousSession, TimelinePoint } from '@/types/report';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  TooltipProps,
} from 'recharts';

interface Props {
  report: SessionReport;
  previousSessions: PreviousSession[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const avg = (arr: number[]) =>
  arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0 && s > 0) return `${m}m ${s}s`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
};

const formatDateTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

const brainBalanceLabel = (val: number) => {
  if (val < -0.25) return 'Left-brain (analytical)';
  if (val > 0.25) return 'Right-brain (creative)';
  return 'Balanced';
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 text-center">
      <div className="text-3xl font-extrabold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-gray-400 mt-1.5 uppercase tracking-wider font-medium">
        {label}
      </div>
    </div>
  );
}

function MetricChangeCard({
  label,
  baseline,
  current,
  higherIsBetter,
}: {
  label: string;
  baseline: number;
  current: number;
  higherIsBetter: boolean;
}) {
  const diff = Math.round(current - baseline);
  const isGood = higherIsBetter ? diff >= 0 : diff <= 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="text-sm font-medium text-gray-500 mb-3">{label}</div>
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Baseline</div>
          <div className="text-2xl font-bold text-gray-300">
            {Math.round(baseline)}
          </div>
        </div>
        <div className="text-gray-300 text-lg flex-1 text-center">→</div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Session end</div>
          <div className="text-2xl font-bold text-gray-800">
            {Math.round(current)}
          </div>
        </div>
        <div
          className={`ml-auto text-sm font-semibold px-3 py-1.5 rounded-full ${
            isGood
              ? 'bg-emerald-50 text-emerald-600'
              : 'bg-red-50 text-red-500'
          }`}
        >
          {diff >= 0 ? '+' : ''}
          {diff}
        </div>
      </div>
    </div>
  );
}

function BrainBalanceBar({
  baseline,
  final,
}: {
  baseline: number;
  final: number;
}) {
  const toPercent = (v: number) => ((v + 1) / 2) * 100;
  const baselinePos = toPercent(baseline);
  const finalPos = toPercent(final);

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>◀ Left (Analytical)</span>
        <span>Balanced</span>
        <span>Right (Creative) ▶</span>
      </div>
      <div className="relative h-8 bg-gradient-to-r from-blue-100 via-purple-50 to-pink-100 rounded-full">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-gray-300 -translate-x-1/2" />
        {/* Baseline marker */}
        <div
          className="absolute top-1 w-2 h-6 bg-gray-300 rounded-full"
          style={{ left: `calc(${baselinePos}% - 4px)` }}
          title={`Baseline: ${brainBalanceLabel(baseline)}`}
        />
        {/* Session end marker */}
        <div
          className="absolute top-1 w-3.5 h-6 bg-indigo-500 rounded-full shadow-md"
          style={{ left: `calc(${finalPos}% - 7px)` }}
          title={`Session end: ${brainBalanceLabel(final)}`}
        />
      </div>
      <div className="flex justify-between mt-2.5 text-xs">
        <span className="text-gray-400">
          ■ Baseline:{' '}
          <span className="text-gray-600 font-medium">
            {brainBalanceLabel(baseline)}
          </span>
        </span>
        <span className="text-indigo-500">
          ■ Session end:{' '}
          <span className="text-indigo-700 font-semibold">
            {brainBalanceLabel(final)}
          </span>
        </span>
      </div>
    </div>
  );
}

function KeyMomentCard({
  emoji,
  title,
  description,
  bg,
}: {
  emoji: string;
  title: string;
  description: string;
  bg: string;
}) {
  return (
    <div className={`rounded-2xl p-4 border ${bg}`}>
      <div className="flex gap-3 items-start">
        <span className="text-2xl shrink-0">{emoji}</span>
        <div>
          <div className="font-semibold text-gray-800 text-sm">{title}</div>
          <div className="text-gray-600 text-sm mt-0.5 leading-relaxed">
            {description}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-500 mb-1.5">{label} min</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          <span className="text-gray-600">{p.name}:</span>
          <span className="font-semibold text-gray-800">
            {Math.round(p.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportClient({ report, previousSessions }: Props) {
  const timeline: TimelinePoint[] = report.timeline ?? [];

  // Chart data: x-axis in minutes (1 decimal)
  const chartData = timeline.map((p) => ({
    ...p,
    time: parseFloat((p.t / 60).toFixed(1)),
  }));

  // Session averages
  const avgFocus = Math.round(avg(timeline.map((p) => p.focus)));
  const avgStress = Math.round(avg(timeline.map((p) => p.stress)));
  const avgCalm = Math.round(avg(timeline.map((p) => p.calm)));

  // Key moments (guard empty timeline)
  const peakFocus =
    timeline.length > 0
      ? timeline.reduce((mx, p) => (p.focus > mx.focus ? p : mx), timeline[0])
      : null;
  const lowestStress =
    timeline.length > 0
      ? timeline.reduce((mn, p) => (p.stress < mn.stress ? p : mn), timeline[0])
      : null;
  const peakCalm =
    timeline.length > 0
      ? timeline.reduce((mx, p) => (p.calm > mx.calm ? p : mx), timeline[0])
      : null;

  // Cross-session comparison
  const hasPrevious = previousSessions.length > 0;
  const prevWithFocus = previousSessions.filter((s) => s.final_focus !== null);
  const prevAvgFocus = prevWithFocus.length > 0 ? Math.round(avg(prevWithFocus.map((s) => s.final_focus!))) : 0;
  const prevAvgStress = prevWithFocus.length > 0 ? Math.round(avg(previousSessions.filter(s => s.final_stress !== null).map((s) => s.final_stress!))) : 0;
  const prevAvgCalm = prevWithFocus.length > 0 ? Math.round(avg(previousSessions.filter(s => s.final_calm !== null).map((s) => s.final_calm!))) : 0;

  const comparisonData = [
    {
      metric: 'Focus',
      Today: Math.round(report.final_focus ?? 0),
      'Previous avg': prevAvgFocus,
    },
    {
      metric: 'Calm',
      Today: Math.round(report.final_calm ?? 0),
      'Previous avg': prevAvgCalm,
    },
    {
      metric: 'Stress',
      Today: Math.round(report.final_stress ?? 0),
      'Previous avg': prevAvgStress,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ── Header ── */}
      <header
        className="text-white"
        style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)' }}
      >
        <div className="max-w-2xl mx-auto px-5 py-10 print:py-6">
          <p className="text-indigo-300 text-xs font-semibold uppercase tracking-widest mb-2">
            LinkBand · Brain Performance Report
          </p>
          <h1 className="text-3xl font-extrabold leading-tight mb-1">
            {report.session_name}
          </h1>
          <p className="text-indigo-200 text-sm">
            {report.first_name} {report.last_name}
          </p>
          <p className="text-indigo-300 text-xs mt-0.5">
            {formatDateTime(report.created_at)} at {formatTime(report.created_at)}
          </p>

          <div className="flex gap-3 mt-6 flex-wrap">
            <div className="bg-white/10 rounded-xl px-4 py-2.5 text-center">
              <div className="text-xl font-bold">
                {formatDuration(report.duration_seconds)}
              </div>
              <div className="text-xs text-indigo-300 mt-0.5">Duration</div>
            </div>
            {report.is_urgent && (
              <div className="bg-amber-400/20 border border-amber-300/30 rounded-xl px-4 py-2.5 text-center">
                <div className="text-xl">⚡</div>
                <div className="text-xs text-indigo-300 mt-0.5">Urgent</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8">

        {/* ── Overview stats ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Session Overview
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <StatCard value={avgFocus} label="Avg Focus" color="#4F7BF7" />
            <StatCard value={avgStress} label="Avg Stress" color="#EF4444" />
            <StatCard value={avgCalm} label="Avg Calm" color="#10B981" />
          </div>
        </section>

        {/* ── Timeline chart ── */}
        {chartData.length > 0 && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-1">
              Your Journey
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              How your brain states evolved, minute by minute
            </p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <ResponsiveContainer width="100%" height={230}>
                <LineChart
                  data={chartData}
                  margin={{ top: 4, right: 4, bottom: 4, left: -22 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                    tickFormatter={(v) => `${v}m`}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="focus"
                    stroke="#4F7BF7"
                    strokeWidth={2}
                    dot={false}
                    name="Focus"
                  />
                  <Line
                    type="monotone"
                    dataKey="stress"
                    stroke="#EF4444"
                    strokeWidth={2}
                    dot={false}
                    name="Stress"
                  />
                  <Line
                    type="monotone"
                    dataKey="calm"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                    name="Calm"
                  />
                  <Line
                    type="monotone"
                    dataKey="cogLoad"
                    stroke="#8B5CF6"
                    strokeWidth={1.5}
                    dot={false}
                    strokeDasharray="4 2"
                    name="Cognitive Load"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Before & After ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-1">
            Before &amp; After
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            Your resting baseline (captured at session start) vs how you finished
          </p>
          <div className="space-y-3">
            <MetricChangeCard
              label="Focus"
              baseline={report.baseline_focus}
              current={report.final_focus}
              higherIsBetter={true}
            />
            <MetricChangeCard
              label="Stress"
              baseline={report.baseline_stress}
              current={report.final_stress}
              higherIsBetter={false}
            />
            <MetricChangeCard
              label="Calm"
              baseline={report.baseline_calm}
              current={report.final_calm}
              higherIsBetter={true}
            />
            <MetricChangeCard
              label="Cognitive Load"
              baseline={report.baseline_cognitive_load}
              current={report.final_cognitive_load}
              higherIsBetter={false}
            />
          </div>
        </section>

        {/* ── Brain Balance ── */}
        <section>
          <h2 className="text-base font-semibold text-gray-700 mb-3">
            Brain Balance
          </h2>
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <p className="text-xs text-gray-400 mb-4">
              Measures left/right hemispheric dominance based on alpha asymmetry.
              Balance near center is typically ideal.
            </p>
            <BrainBalanceBar
              baseline={report.baseline_brain_balance}
              final={report.final_brain_balance}
            />
          </div>
        </section>

        {/* ── Cross-session comparison ── */}
        {hasPrevious && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-1">
              Today vs Previous Sessions
            </h2>
            <p className="text-xs text-gray-400 mb-3">
              Compared with your last {previousSessions.length} session
              {previousSessions.length > 1 ? 's' : ''}
            </p>
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={comparisonData}
                  margin={{ top: 4, right: 4, bottom: 4, left: -22 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis
                    dataKey="metric"
                    tick={{ fontSize: 11, fill: '#9ca3af' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 10, fill: '#9ca3af' }}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar
                    dataKey="Today"
                    fill="#4F46E5"
                    radius={[6, 6, 0, 0]}
                  />
                  <Bar
                    dataKey="Previous avg"
                    fill="#e5e7eb"
                    radius={[6, 6, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Previous session list */}
            <div className="mt-3 space-y-2">
              {previousSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-xl px-4 py-3 flex justify-between items-center shadow-sm border border-gray-100"
                >
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {s.session_name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(s.created_at)} ·{' '}
                      {formatDuration(s.duration_seconds)}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs">
                    {s.final_focus !== null && (
                      <span className="bg-blue-50 text-blue-600 font-semibold px-2 py-0.5 rounded-full">
                        F {Math.round(s.final_focus)}
                      </span>
                    )}
                    {s.final_stress !== null && (
                      <span className="bg-red-50 text-red-500 font-semibold px-2 py-0.5 rounded-full">
                        S {Math.round(s.final_stress)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Key Moments ── */}
        {timeline.length > 0 && peakFocus && lowestStress && peakCalm && (
          <section>
            <h2 className="text-base font-semibold text-gray-700 mb-3">
              Key Moments
            </h2>
            <div className="space-y-3">
              <KeyMomentCard
                emoji="🎯"
                title="Peak Focus"
                description={`Your highest focus of ${Math.round(peakFocus.focus)} was at ${formatDuration(peakFocus.t)} into the session. Your mind was fully locked in.`}
                bg="bg-blue-50 border-blue-100"
              />
              <KeyMomentCard
                emoji="🌊"
                title="Most Relaxed Moment"
                description={`Lowest stress point (${Math.round(lowestStress.stress)}) at ${formatDuration(lowestStress.t)} — your nervous system was at its calmest.`}
                bg="bg-emerald-50 border-emerald-100"
              />
              <KeyMomentCard
                emoji="🧘"
                title="Deepest Calm"
                description={`Peak calm score of ${Math.round(peakCalm.calm)} at ${formatDuration(peakCalm.t)}. This was your most settled, balanced state during the session.`}
                bg="bg-purple-50 border-purple-100"
              />
            </div>
          </section>
        )}

        {/* ── Download PDF ── */}
        <section className="no-print pb-4">
          <button
            onClick={() => window.print()}
            className="w-full text-white py-4 rounded-2xl font-semibold text-base shadow-md hover:shadow-lg active:scale-98 transition-all"
            style={{
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
            }}
          >
            Download as PDF
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Opens your browser's print dialog — choose "Save as PDF"
          </p>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 no-print">
        Powered by{' '}
        <a href="https://nestly.ink" className="hover:text-gray-600 transition-colors">
          LinkBand
        </a>{' '}
        · nestly.ink
      </footer>
    </div>
  );
}
