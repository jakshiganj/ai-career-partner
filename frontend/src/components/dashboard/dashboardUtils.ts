import { type PipelineResultState } from '../../api/pipeline';

interface DResult {
    cv_health?: { ats_score?: number; feedback?: unknown; cover_letter?: string };
    cv_raw?: string;
    goal?: string;
    skill_roadmap?: unknown;
    interview_readiness?: { question_bank?: unknown };
    pipeline_status?: { current_stage?: number; is_running?: boolean };
}

export function mapDashboardToResult(d: unknown): PipelineResultState | null {
    if (!d) return null;
    const val = d as DResult;
    return {
        ats_score: val.cv_health?.ats_score ?? undefined,
        ats_breakdown: val.cv_health?.feedback as Record<string, unknown> | null | undefined,
        cv_raw: val.cv_raw,
        job_description: val.goal,
        cover_letter: val.cv_health?.cover_letter ?? undefined,
        optimised_cv: undefined,
        skill_roadmap: Array.isArray(val.skill_roadmap) ? (val.skill_roadmap as PipelineResultState['skill_roadmap']) : undefined,
        interview_question_bank: val.interview_readiness?.question_bank as string[] | null | undefined,
        current_stage: val.pipeline_status?.current_stage ?? 0,
        status: val.pipeline_status?.is_running ? 'running' : 'completed',
    };
}
