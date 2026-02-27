import client from './client';

export interface PipelineRunPayload {
    goal: string;
    cv_text: string;
    skills: string[];
}

export async function runPipeline(payload: PipelineRunPayload) {
    const { data } = await client.post('/pipeline/start', {
        cv_text: payload.cv_text,
        job_description: payload.goal, // Frontend "goal" maps to Backend "job_description"
        options: {
            run_interview_prep: true,
            tone: "formal"
        }
    });
    return data as { status: string; pipeline_id: string };
}

export async function getTaskState(pipelineId: string) {
    const { data } = await client.get(`/pipeline/${pipelineId}/status`);
    return data as {
        status: string;
        current_stage: number;
        completed_stages: number[];
        error_log: string[];
    };
}
