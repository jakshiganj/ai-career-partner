import client from './client';

export interface ActionItem {
    task: string;
    completed: boolean;
}

export interface RoadmapPhase {
    phase_name?: string;
    focus?: string;
    estimated_weeks?: number;
    duration_weeks?: number;
    weeks?: number;
    skills_covered?: string[];
    action_items?: Array<string | ActionItem>;
    milestones?: string[];
}

export interface SkillRoadmapResponse {
    id: string;
    user_id: string;
    pipeline_id: string;
    roadmap: RoadmapPhase[];
    target_role: string;
}

export async function getCurrentRoadmap(): Promise<SkillRoadmapResponse> {
    const res = await client.get('/roadmap/current');
    return res.data;
}

export async function updateRoadmap(id: string, roadmap: RoadmapPhase[]): Promise<SkillRoadmapResponse> {
    const res = await client.patch(`/roadmap/${id}`, roadmap);
    return res.data;
}

export async function pivotRoadmap(id: string, constraint: string): Promise<SkillRoadmapResponse> {
    const res = await client.post(`/roadmap/${id}/pivot`, { constraint });
    return res.data;
}

export async function chatRoadmap(id: string, message: string): Promise<{ reply: string, roadmap: SkillRoadmapResponse }> {
    const res = await client.post(`/roadmap/${id}/chat`, { message });
    return res.data;
}
