import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { SessionReport, PreviousSession } from '@/types/report';
import ReportClient from './ReportClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const { data: report } = await supabase
    .from('session_reports')
    .select('session_name, first_name, last_name')
    .eq('id', params.id)
    .single();

  if (!report) return { title: 'Report Not Found — LinkBand' };

  return {
    title: `${report.session_name} — LinkBand Report`,
    description: `Brain performance report for ${report.first_name} ${report.last_name}`,
  };
}

export default async function ReportPage({
  params,
}: {
  params: { id: string };
}) {
  const { data: report, error } = await supabase
    .from('session_reports')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !report) notFound();

  const { data: previousSessions } = await supabase
    .from('session_reports')
    .select(
      'id, session_name, created_at, final_focus, final_stress, final_calm, duration_seconds'
    )
    .eq('email', report.email)
    .neq('id', params.id)
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <ReportClient
      report={report as SessionReport}
      previousSessions={(previousSessions as PreviousSession[]) ?? []}
    />
  );
}
