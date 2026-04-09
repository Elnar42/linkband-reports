'use client';

import { useState, useRef, useEffect } from 'react';
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
  ReferenceLine,
} from 'recharts';

interface Props {
  report: SessionReport;
  previousSessions: PreviousSession[];
  audioUrl: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const avg = (arr: number[]) =>
  arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const formatDuration = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
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
  if (val < -0.25) return 'Left Hemispheric (Analytical)';
  if (val > 0.25) return 'Right Hemispheric (Creative)';
  return 'Balanced';
};

const scoreInterpretation = (value: number, metric: string) => {
  if (metric === 'Stress') {
    if (value < 30) return { label: 'Low', color: '#10b981' };
    if (value < 60) return { label: 'Moderate', color: '#f59e0b' };
    return { label: 'Elevated', color: '#ef4444' };
  }
  if (value < 30) return { label: 'Low', color: '#ef4444' };
  if (value < 60) return { label: 'Moderate', color: '#f59e0b' };
  return { label: 'High', color: '#10b981' };
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function SummaryMetricCard({
  value,
  label,
  accentColor,
  interpretation,
}: {
  value: number;
  label: string;
  accentColor: string;
  interpretation: { label: string; color: string };
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <div
        className="text-4xl font-black mb-1"
        style={{ color: accentColor, fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
        <span className="text-lg font-medium text-gray-300 ml-1">/100</span>
      </div>
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">
        {label}
      </div>
      <div
        className="text-xs font-semibold px-2 py-0.5 rounded-full inline-block"
        style={{ background: interpretation.color + '18', color: interpretation.color }}
      >
        {interpretation.label}
      </div>
    </div>
  );
}

function DeltaIndicator({
  label,
  baseline,
  final,
  higherIsBetter,
}: {
  label: string;
  baseline: number;
  final: number;
  higherIsBetter: boolean;
}) {
  const diff = Math.round(final - baseline);
  const isPositive = diff >= 0;
  const isGood = higherIsBetter ? isPositive : !isPositive;
  const absVal = Math.abs(diff);

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600 font-medium w-32">{label}</span>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Baseline</div>
          <div className="font-semibold text-gray-400">{Math.round(baseline)}</div>
        </div>
        <div className="text-gray-300">→</div>
        <div className="text-center">
          <div className="text-xs text-gray-400 mb-0.5">Final</div>
          <div className="font-semibold text-gray-700">{Math.round(final)}</div>
        </div>
        <div
          className="text-xs font-bold px-2.5 py-1 rounded-full min-w-[52px] text-center"
          style={{
            background: isGood ? '#10b98118' : '#ef444418',
            color: isGood ? '#059669' : '#dc2626',
          }}
        >
          {isPositive ? '+' : '−'}{absVal}
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
      <div className="flex justify-between text-xs text-gray-400 mb-2.5 font-medium">
        <span>Left (Analytical)</span>
        <span>Balanced</span>
        <span>Right (Creative)</span>
      </div>
      <div className="relative h-7 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="absolute inset-0 rounded-full opacity-30"
          style={{ background: 'linear-gradient(to right, #3b82f6, #e5e7eb, #ec4899)' }}
        />
        <div className="absolute left-1/2 top-0 w-px h-full bg-gray-400 -translate-x-1/2 opacity-50" />
        <div
          className="absolute top-1.5 w-2 h-4 bg-gray-300 rounded-full shadow"
          style={{ left: `calc(${baselinePos}% - 4px)` }}
          title={`Baseline: ${brainBalanceLabel(baseline)}`}
        />
        <div
          className="absolute top-1 w-3.5 h-5 bg-indigo-600 rounded-full shadow-md"
          style={{ left: `calc(${finalPos}% - 7px)` }}
          title={`Session end: ${brainBalanceLabel(final)}`}
        />
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <div className="flex items-center gap-1.5 text-gray-400">
          <span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />
          Baseline: <span className="font-medium text-gray-500">{brainBalanceLabel(baseline)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-indigo-600">
          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block" />
          Session End: <span className="font-medium">{brainBalanceLabel(final)}</span>
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-xl p-3 text-xs min-w-[130px]">
      <p className="font-semibold text-gray-400 mb-2 border-b border-gray-100 pb-1.5">
        {label} min
      </p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center justify-between gap-3 mb-1">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-gray-500">{p.name}</span>
          </div>
          <span className="font-bold text-gray-800">{Math.round(p.value as number)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function ReportClient({ report, previousSessions, audioUrl }: Props) {
  const timeline: TimelinePoint[] = report.timeline ?? [];

  const chartData = timeline.map((p) => ({
    ...p,
    time: parseFloat((p.t / 60).toFixed(1)),
  }));

  const avgFocus = Math.round(avg(timeline.map((p) => p.focus)));
  const avgStress = Math.round(avg(timeline.map((p) => p.stress)));
  const avgCalm = Math.round(avg(timeline.map((p) => p.calm)));
  const avgCogLoad = Math.round(avg(timeline.map((p) => p.cogLoad)));

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

  const hasPrevious = previousSessions.length > 0;
  const prevAvgFocus = Math.round(avg(previousSessions.filter(s => s.final_focus !== null).map(s => s.final_focus!)));
  const prevAvgStress = Math.round(avg(previousSessions.filter(s => s.final_stress !== null).map(s => s.final_stress!)));
  const prevAvgCalm = Math.round(avg(previousSessions.filter(s => s.final_calm !== null).map(s => s.final_calm!)));

  const comparisonData = [
    { metric: 'Focus', Current: Math.round(report.final_focus ?? 0), 'Previous Avg': prevAvgFocus },
    { metric: 'Calm', Current: Math.round(report.final_calm ?? 0), 'Previous Avg': prevAvgCalm },
    { metric: 'Stress', Current: Math.round(report.final_stress ?? 0), 'Previous Avg': prevAvgStress },
  ];

  // ── Audio playback ──────────────────────────────────────────────────────────
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setAudioCurrentTime(audio.currentTime);
    const onLoaded = () => setAudioDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('durationchange', onLoaded);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('durationchange', onLoaded);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().catch(() => {}); setIsPlaying(true); }
  };

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, seconds);
    setAudioCurrentTime(Math.max(0, seconds));
  };

  const formatAudioTime = (s: number) => {
    if (!isFinite(s) || isNaN(s) || s === 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // x-axis is in minutes; keep the cursor in the same unit
  const cursorMins = audioCurrentTime / 60;

  return (
    <div className="min-h-screen bg-[#F7F8FB] font-sans">

      {/* ── Header ── */}
      <header style={{ background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)' }}>
        <div className="max-w-2xl mx-auto px-6 py-10 print:py-6">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-indigo-400 text-xs font-semibold uppercase tracking-[2px]">
              LinkBand
            </span>
            <span className="text-indigo-600 text-xs">·</span>
            <span className="text-indigo-400 text-xs font-semibold uppercase tracking-[2px]">
              EEG Brain Performance Report
            </span>
          </div>

          <h1 className="text-white text-3xl font-black leading-tight mb-1">
            {report.session_name}
          </h1>
          <p className="text-indigo-300 text-sm font-medium mb-0.5">
            {report.first_name} {report.last_name}
          </p>
          <p className="text-indigo-400 text-xs">
            {formatDateTime(report.created_at)} &nbsp;·&nbsp; {formatTime(report.created_at)}
          </p>

          <div className="flex gap-3 mt-7 flex-wrap">
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <div className="text-white text-base font-bold">{formatDuration(report.duration_seconds)}</div>
              <div className="text-indigo-300 text-xs mt-0.5">Session duration</div>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 border border-white/10">
              <div className="text-white text-base font-bold">{timeline.length}</div>
              <div className="text-indigo-300 text-xs mt-0.5">Data points recorded</div>
            </div>
            {report.is_urgent && (
              <div className="bg-amber-500/20 rounded-xl px-5 py-3 border border-amber-400/30">
                <div className="text-amber-300 text-base font-bold">Early Stop</div>
                <div className="text-amber-400 text-xs mt-0.5">Urgent session</div>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8 space-y-8">

        {/* ── Session Summary ── */}
        <section>
          <SectionHeader title="Session Summary" subtitle="Average scores across the full recording period" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <SummaryMetricCard
              value={avgFocus}
              label="Focus"
              accentColor="#4F46E5"
              interpretation={scoreInterpretation(avgFocus, 'Focus')}
            />
            <SummaryMetricCard
              value={avgStress}
              label="Stress"
              accentColor="#ef4444"
              interpretation={scoreInterpretation(avgStress, 'Stress')}
            />
            <SummaryMetricCard
              value={avgCalm}
              label="Calm"
              accentColor="#10b981"
              interpretation={scoreInterpretation(avgCalm, 'Calm')}
            />
            <SummaryMetricCard
              value={avgCogLoad}
              label="Cognitive Load"
              accentColor="#8b5cf6"
              interpretation={scoreInterpretation(avgCogLoad, 'Cognitive Load')}
            />
          </div>
        </section>

        {/* ── Performance Timeline ── */}
        {chartData.length > 0 && (
          <section>
            <SectionHeader
              title="Performance Timeline"
              subtitle={
                audioUrl
                  ? 'Click anywhere on the chart to jump to that moment in the recording'
                  : 'Brain state metrics recorded minute-by-minute throughout the session'
              }
            />
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              {/* Chart — clickable when audio is present */}
              <div style={{ cursor: audioUrl ? 'pointer' : 'default' }}>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart
                    data={chartData}
                    margin={{ top: 8, right: 8, bottom: 4, left: -20 }}
                    onClick={audioUrl ? (data: any) => {
                      const t = data?.activePayload?.[0]?.payload?.time;
                      if (t != null) seekTo(t * 60);
                    } : undefined}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      type="number"
                      dataKey="time"
                      domain={['dataMin', 'dataMax']}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      tickFormatter={(v) => `${Math.round(v)}m`}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 10, fill: '#9ca3af' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="focus" stroke="#4F46E5" strokeWidth={2} dot={false} name="Focus" />
                    <Line type="monotone" dataKey="stress" stroke="#ef4444" strokeWidth={2} dot={false} name="Stress" />
                    <Line type="monotone" dataKey="calm" stroke="#10b981" strokeWidth={2} dot={false} name="Calm" />
                    <Line
                      type="monotone"
                      dataKey="cogLoad"
                      stroke="#8b5cf6"
                      strokeWidth={1.5}
                      dot={false}
                      strokeDasharray="4 3"
                      name="Cognitive Load"
                    />
                    {/* Playback cursor — moves as audio plays */}
                    {audioUrl && (
                      <ReferenceLine
                        x={cursorMins}
                        stroke="#6366f1"
                        strokeWidth={2}
                        strokeDasharray="4 3"
                        label={{ value: '▶', fill: '#6366f1', fontSize: 10, position: 'insideTopRight' }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Audio player — only when a recording exists */}
              {audioUrl && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <audio ref={audioRef} src={audioUrl} preload="metadata" className="hidden" />
                  <div className="flex items-center gap-3">
                    {/* Play / Pause */}
                    <button
                      onClick={togglePlay}
                      className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 flex items-center justify-center shrink-0 transition-colors"
                      aria-label={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="white">
                          <rect x="1.5" y="1" width="3" height="9" rx="1" />
                          <rect x="6.5" y="1" width="3" height="9" rx="1" />
                        </svg>
                      ) : (
                        <svg width="11" height="11" viewBox="0 0 11 11" fill="white">
                          <path d="M2.5 1.5l7 4-7 4V1.5z" />
                        </svg>
                      )}
                    </button>

                    {/* Seek bar */}
                    <div className="flex-1">
                      <input
                        type="range"
                        min={0}
                        max={audioDuration || 1}
                        step={0.5}
                        value={audioCurrentTime}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        className="w-full accent-indigo-600 cursor-pointer"
                        style={{ height: '4px' }}
                      />
                    </div>

                    {/* Time */}
                    <span className="text-xs text-gray-400 tabular-nums shrink-0">
                      {formatAudioTime(audioCurrentTime)} / {formatAudioTime(audioDuration)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Baseline Comparison ── */}
        <section>
          <SectionHeader
            title="Baseline Comparison"
            subtitle="Resting state captured during calibration vs. values at session end"
          />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-2">
            <DeltaIndicator label="Focus" baseline={report.baseline_focus} final={report.final_focus} higherIsBetter={true} />
            <DeltaIndicator label="Stress" baseline={report.baseline_stress} final={report.final_stress} higherIsBetter={false} />
            <DeltaIndicator label="Calm" baseline={report.baseline_calm} final={report.final_calm} higherIsBetter={true} />
            <DeltaIndicator label="Cognitive Load" baseline={report.baseline_cognitive_load} final={report.final_cognitive_load} higherIsBetter={false} />
          </div>
        </section>

        {/* ── Brain Balance ── */}
        <section>
          <SectionHeader
            title="Hemispheric Balance"
            subtitle="Alpha-band asymmetry index — indicates left/right neural dominance during the session"
          />
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <BrainBalanceBar baseline={report.baseline_brain_balance} final={report.final_brain_balance} />
          </div>
        </section>

        {/* ── Peak Performance Markers ── */}
        {timeline.length > 0 && peakFocus && lowestStress && peakCalm && (
          <section>
            <SectionHeader
              title="Session Markers"
              subtitle="Notable points identified in the recording timeline"
            />
            <div className="space-y-3">
              <MarkerCard
                label="Peak Focus"
                time={formatDuration(peakFocus.t)}
                value={Math.round(peakFocus.focus)}
                metric="Focus"
                accentColor="#4F46E5"
                description={`Highest focus score of ${Math.round(peakFocus.focus)} recorded at ${formatDuration(peakFocus.t)} into the session.`}
              />
              <MarkerCard
                label="Lowest Stress"
                time={formatDuration(lowestStress.t)}
                value={Math.round(lowestStress.stress)}
                metric="Stress"
                accentColor="#10b981"
                description={`Minimum stress level of ${Math.round(lowestStress.stress)} at ${formatDuration(lowestStress.t)}.`}
              />
              <MarkerCard
                label="Peak Calm"
                time={formatDuration(peakCalm.t)}
                value={Math.round(peakCalm.calm)}
                metric="Calm"
                accentColor="#8b5cf6"
                description={`Maximum calm state of ${Math.round(peakCalm.calm)} recorded at ${formatDuration(peakCalm.t)}.`}
              />
            </div>
          </section>
        )}

        {/* ── Cross-session Comparison ── */}
        {hasPrevious && (
          <section>
            <SectionHeader
              title="Cross-Session Comparison"
              subtitle={`Current session vs. average of ${previousSessions.length} previous session${previousSessions.length > 1 ? 's' : ''}`}
            />
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm mb-3">
              <ResponsiveContainer width="100%" height={190}>
                <BarChart
                  data={comparisonData}
                  margin={{ top: 4, right: 4, bottom: 4, left: -22 }}
                  barCategoryGap="35%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Current" fill="#4F46E5" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="Previous Avg" fill="#e5e7eb" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {previousSessions.map((s) => (
                <div
                  key={s.id}
                  className="bg-white rounded-xl px-4 py-3 flex justify-between items-center border border-gray-100 shadow-sm"
                >
                  <div>
                    <div className="text-sm font-semibold text-gray-700">{s.session_name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {formatDateTime(s.created_at)} · {formatDuration(s.duration_seconds)}
                    </div>
                  </div>
                  <div className="flex gap-2 text-xs shrink-0">
                    {s.final_focus !== null && (
                      <span className="bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
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

        {/* ── Download ── */}
        <section className="no-print pb-4">
          <button
            onClick={() => window.print()}
            className="w-full text-white py-4 rounded-xl font-semibold text-base shadow hover:shadow-md transition-all"
            style={{ background: 'linear-gradient(135deg, #1e1b4b, #4338ca)' }}
          >
            Download as PDF
          </button>
          <p className="text-center text-xs text-gray-400 mt-2">
            Use your browser&apos;s print dialog and choose &quot;Save as PDF&quot;
          </p>
        </section>
      </main>

      <footer className="text-center py-6 text-xs text-gray-400 border-t border-gray-100 no-print">
        <span className="font-medium text-gray-500">LinkBand</span> · EEG Brain Performance Analysis ·{' '}
        <a href="https://nestly.ink" className="hover:text-gray-600 transition-colors underline underline-offset-2">
          nestly.ink
        </a>
      </footer>
    </div>
  );
}

// ─── Shared layout components ─────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-bold text-gray-800">{title}</h2>
      {subtitle && (
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

function MarkerCard({
  label,
  time,
  value,
  metric,
  accentColor,
  description,
}: {
  label: string;
  time: string;
  value: number;
  metric: string;
  accentColor: string;
  description: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{ background: accentColor + '18', color: accentColor }}
            >
              {label}
            </span>
            <span className="text-xs text-gray-400">at {time}</span>
          </div>
          <p className="text-sm text-gray-600 leading-relaxed">{description}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black" style={{ color: accentColor }}>
            {value}
          </div>
          <div className="text-xs text-gray-400">{metric}</div>
        </div>
      </div>
    </div>
  );
}
