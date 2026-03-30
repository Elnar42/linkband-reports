export interface TimelinePoint {
  t: number;           // seconds from session start
  focus: number;       // 0-100
  stress: number;      // 0-100
  calm: number;        // 0-100
  cogLoad: number;     // 0-100
  brainBalance: number; // -1 (left) to +1 (right)
}

export interface SessionReport {
  id: string;
  session_name: string;
  first_name: string;
  last_name: string;
  email: string;
  duration_seconds: number;
  is_urgent: boolean;
  baseline_focus: number;
  baseline_stress: number;
  baseline_calm: number;
  baseline_cognitive_load: number;
  baseline_brain_balance: number;
  final_focus: number;
  final_stress: number;
  final_calm: number;
  final_cognitive_load: number;
  final_brain_balance: number;
  timeline: TimelinePoint[];
  created_at: string;
}

export interface PreviousSession {
  id: string;
  session_name: string;
  created_at: string;
  final_focus: number | null;
  final_stress: number | null;
  final_calm: number | null;
  duration_seconds: number;
}
