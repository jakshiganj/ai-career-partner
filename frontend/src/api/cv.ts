import client from './client';

export async function uploadCV(file: File) {
    const form = new FormData();
    form.append('file', file);
    const { data } = await client.post('/cv/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data as { message: string; cv_id: number; text_preview: string };
}

export async function analyzeCV(cvId: number) {
    const { data } = await client.post(`/cv/analyze/${cvId}`);
    return data as { cv_id: number; ai_feedback: string };
}
