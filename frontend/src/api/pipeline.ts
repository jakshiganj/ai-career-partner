import client from './client';

export interface PipelineRunPayload {
    goal: string;
    cv_text: string;
    skills: string[];
}

export interface PipelineRunSummary {
    id: string;
    label: string;
    created_at: string | null;
    ats_score: number | null;
    status: string;
    current_stage: number;
}

export interface PipelineRunsResponse {
    runs: PipelineRunSummary[];
}

/** Full pipeline state as returned by GET /api/pipeline/:id/result (state_json). */
export interface PipelineResultState {
    pipeline_id?: string;
    user_id?: string;
    status?: string;
    current_stage?: number;
    cv_raw?: string;
    job_description?: string;
    candidate_profile?: Record<string, unknown>;
    ats_score?: number | null;
    ats_breakdown?: Record<string, unknown> | null;
    skill_gaps?: string[] | null;
    skill_match_score?: number | null;
    market_trends?: Record<string, unknown> | null;
    salary_benchmarks?: Record<string, unknown> | null;
    cv_critique?: string | null;
    optimised_cv?: string | null;
    cover_letter?: string | null;
    job_tier?: string | null;
    missing_skills?: string[] | null;
    skill_roadmap?: Array<{ skill?: string; weeks?: number; completed?: boolean; focus?: string; duration_weeks?: number; milestones?: string[] }> | null;
    interview_question_bank?: string[] | null;
    market_analysis?: { market_analysis?: Record<string, { status?: string; snippets?: string[] }>; hot_skills?: string[] };
    created_at?: string;
    completed_at?: string | null;
    error_log?: string[];
    critique?: {
        summary?: string;
        matching_skills?: string[];
        transferable_skills?: string[];
        missing_critical_skills?: string[];
    };
    implicit_skills?: string[];
}

export async function runPipeline(payload: PipelineRunPayload) {
    const { data } = await client.post('/pipeline/start', {
        cv_text: payload.cv_text,
        job_description: payload.goal,
        options: {
            run_interview_prep: true,
            tone: "formal"
        }
    });
    return data as { status: string; pipeline_id: string };
}

export async function getPipelineRuns(limit = 8): Promise<PipelineRunsResponse> {
    const { data } = await client.get<PipelineRunsResponse>('/pipeline/runs', { params: { limit } });
    return data;
}

export async function getPipelineStatus(pipelineId: string) {
    const { data } = await client.get(`/pipeline/${pipelineId}/status`);
    return data as {
        status: string;
        current_stage: number;
        completed_stages: number[];
        error_log: string[];
    };
}

export async function getPipelineResult(pipelineId: string): Promise<PipelineResultState> {
    const { data } = await client.get<PipelineResultState>(`/pipeline/${pipelineId}/result`);
    return data;
}

/** @deprecated Use getPipelineStatus */
export async function getTaskState(pipelineId: string) {
    return getPipelineStatus(pipelineId);
}
