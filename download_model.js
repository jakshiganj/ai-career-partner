const https = require('https');
const fs = require('fs');
const path = require('path');

const files = {
    "config.json": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/config.json",
    "tokenizer.json": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/tokenizer.json",
    "tokenizer_config.json": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/tokenizer_config.json",
    "onnx/model_quantized.onnx": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/onnx/model_quantized.onnx"
};

const basePath = path.join(__dirname, 'backend', 'static', 'models', 'pii-ner');

function download(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close(resolve);
            });
        }).on('error', (err) => {
            fs.unlink(dest, () => reject(err));
        });
    });
}

async function run() {
    console.log("Starting download of AI model files via Node.js...");
    for (const [filename, url] of Object.entries(files)) {
        const fullPath = path.join(basePath, filename);
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        console.log(`Downloading ${filename}...`);
        await download(url, fullPath);
    }
    console.log("All AI model files downloaded successfully!");
}

run().catch(console.error);
