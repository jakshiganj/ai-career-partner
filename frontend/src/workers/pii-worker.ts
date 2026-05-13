import { pipeline, env } from '@xenova/transformers';

// Skip local check to download from Hugging Face hub
env.allowLocalModels = false;

class PIIPipeline {
    static task = 'token-classification' as const;
    static model = 'Xenova/bert-base-NER' as const;
    static instance: any = null;

    static async getInstance(progress_callback?: any) {
        if (this.instance === null) {
            this.instance = pipeline(this.task, this.model, { 
                progress_callback,
                // Quantization is enabled by default in Transformers.js for most models
                // but we specify it here for clarity with the report.
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
        const classifier = await PIIPipeline.getInstance((data: any) => {
            // Send progress updates back to the UI
            self.postMessage({ status: 'progress', data });
        });

        // 2. Run NER
        // We look for: PER (Person), ORG (Organization), LOC (Location)
        const output = await classifier(text);

        // 3. Define Regex for Emails and Phones (High Precision)
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        // Updated to support 2-3 digit area/network codes (e.g., +94 77 123 4567)
        const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,3}\)?[-.\s]?\d{3}[-.\s]?\d{4,}/g;

        let redactedText = text;

        // Apply Regex Redactions first
        redactedText = redactedText.replace(emailRegex, '[REDACTED_EMAIL]');
        redactedText = redactedText.replace(phoneRegex, '[REDACTED_PHONE]');
        
        // 4. Run NER Redactions
        const entities = output.sort((a: any, b: any) => b.start - a.start);

        for (const entity of entities) {
            const label = entity.entity;
            const start = entity.start;
            const end = entity.end;

            const originalWord = text.substring(start, end);
            
            if (label.includes('PER')) {
                redactedText = redactedText.split(originalWord).join('[REDACTED_NAME]');
            } else if (label.includes('LOC')) {
                redactedText = redactedText.split(originalWord).join('[REDACTED_LOCATION]');
            }
        }

        // 4. Send result back
        self.postMessage({ status: 'complete', redactedText });

    } catch (error: any) {
        self.postMessage({ status: 'error', error: error.message });
    }
});
