import client from './client';

export interface PipelineRunPayload {
    goal: string;
    cv_text: string;
    skills: string[];
}

export async function runPipeline(payload: PipelineRunPayload) {
    const { data } = await client.post('/pipeline/run', payload);
    return data as { message: string; task_state_id: number; subscribe_at: string };
}

export async function getTaskState(taskId: number) {
    const { data } = await client.get(`/pipeline/${taskId}`);
    return data as {
        id: number;
        status: string;
        current_agent: string | null;
        missing_fields: string | null;
        updated_at: string;
    };
}
