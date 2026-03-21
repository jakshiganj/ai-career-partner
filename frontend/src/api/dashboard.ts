import client from './client';

export interface DashboardSummary {
    cv_raw?: string;
    goal?: string;
    pipeline_status?: {
        is_running: boolean;
        current_stage: number;
        pipeline_id: string | null;
    };
    cv_health?: {
        version?: number;
        ats_score?: number | null;
        feedback?: Record<string, unknown> | null;
        critique?: string | null;
        cover_letter?: string | null;
        last_updated?: string | null;
    };
    job_matches?: Array<{
        id: string;
        title: string;
        company: string;
        match_score: number;
        tier: string;
        missing_skills?: string[];
        salary_min?: number;
        salary_max?: number;
        url?: string;
    }>;
    hot_skills?: string[];
    salary_benchmarks?: Array<{
        role_title: string;
        salary_min?: number;
        salary_median?: number;
        salary_max?: number;
        currency?: string;
    }>;
    skill_progress?: { roadmap_exists: boolean; completed: number; total: number };
    skill_roadmap?: unknown[];
    interview_readiness?: {
        last_score?: number | null;
        report?: {
            overall_score?: number;
            relevance?: number;
            clarity?: number;
            depth?: number;
            star_compliance?: number;
            feedback?: string;
            tips?: Record<string, string>;
            transcript?: string;
        } | null;
        trend?: Array<{ date: string; score: number }>;
        question_bank?: string[];
    };
    next_actions?: string[];
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
    const { data } = await client.get<DashboardSummary>('/dashboard');
    return data;
}
