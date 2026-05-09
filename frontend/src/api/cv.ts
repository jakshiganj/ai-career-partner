import client from './client';

export interface CVUploadResponse {
    message: string;
    cv_id: string;
    text_preview: string;
}

export interface CVAnalysisResponse {
    cv_id: string;
    ai_feedback: string;
}

/**
 * Uploads CV text to the backend.
 * NOTE: Text extraction and PII redaction should happen on the client-side
 * before calling this, to ensure privacy and efficiency.
 */
export async function uploadCV(text: string): Promise<CVUploadResponse> {
    const { data } = await client.post<CVUploadResponse>('/cv/upload', { text });
    return data;
}

export async function analyzeCV(cvId: string): Promise<CVAnalysisResponse> {
    const { data } = await client.post<CVAnalysisResponse>(`/cv/analyze/${cvId}`);
    return data;
}
