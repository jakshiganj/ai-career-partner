import { pipeline, env } from '@xenova/transformers';

// Configure to look for models locally on our own domain
env.allowLocalModels = false;
env.useBrowserCache = true;

console.log('🚀 PII Worker v4 (Official Xenova) Loaded');

interface NEREntity {
    entity: string;
    start: number;
    end: number;
    score: number;
    word: string;
}

type PipelineInstance = ReturnType<typeof pipeline>;

class PIIPipeline {
    static task = 'token-classification' as const;
    static model = 'Xenova/bert-base-NER' as const;
    static instance: PipelineInstance | null = null;

    static async getInstance(progress_callback?: (data: { progress?: number }) => void) {
        if (this.instance === null) {
            // Reset to defaults for public Hugging Face access
            env.remoteHost = 'https://huggingface.co';
            env.remotePathTemplate = '{model}/resolve/{revision}/';

            this.instance = pipeline(this.task, this.model, { 
                progress_callback,
                quantized: true 
            });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    const { text } = event.data;

    if (!text) return;

    try {
        // 1. Initialize pipeline
        const classifier = await PIIPipeline.getInstance((data: { progress?: number }) => {
            // Send progress updates back to the UI
            self.postMessage({ status: 'progress', data });
        });

        // 2. Run NER in chunks to prevent OOM
        // Most NER models have a token limit (usually 512). Chunking also keeps RAM usage stable.
        const chunkSize = 400; // Character-based chunks
        const chunks: string[] = [];
        for (let i = 0; i < text.length; i += chunkSize) {
            chunks.push(text.substring(i, i + chunkSize));
        }

        const allEntities: NEREntity[] = [];
        let offset = 0;

        for (const chunk of chunks) {
            const chunkOutput = await classifier(chunk) as NEREntity[];
            for (const entity of chunkOutput) {
                allEntities.push({
                    ...entity,
                    start: entity.start + offset,
                    end: entity.end + offset
                });
            }
            offset += chunk.length;
        }

        // 3. Define Regex for Emails and Phones (High Precision)
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}/g;

        let redactedText = text;

        // Apply Regex Redactions first
        redactedText = redactedText.replace(emailRegex, '[REDACTED_EMAIL]');
        redactedText = redactedText.replace(phoneRegex, '[REDACTED_PHONE]');
        
        // 4. Run NER Redactions
        // Sort entities by length (longest first) to avoid partial redactions
        const entities = allEntities.sort((a: NEREntity, b: NEREntity) => (b.end - b.start) - (a.end - a.start));
        
        // Use a Set to track words we've already redacted to avoid infinite loops
        const redactedWords = new Set<string>();

        for (const entity of entities) {
            const label = entity.entity;
            const originalWord = text.substring(entity.start, entity.end);
            
            if (originalWord.length < 2 || redactedWords.has(originalWord)) continue;

            if (label.includes('PER')) {
                redactedText = redactedText.split(originalWord).join('[REDACTED_NAME]');
                redactedWords.add(originalWord);
            } else if (label.includes('LOC')) {
                redactedText = redactedText.split(originalWord).join('[REDACTED_LOCATION]');
                redactedWords.add(originalWord);
            }
        }

        // 5. Send result back
        self.postMessage({ status: 'complete', redactedText });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        self.postMessage({ status: 'error', error: message });
    }
});
