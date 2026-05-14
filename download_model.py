import urllib.request
import os

files = {
    "config.json": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/config.json",
    "tokenizer.json": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/tokenizer.json",
    "tokenizer_config.json": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/tokenizer_config.json",
    "onnx/model_quantized.onnx": "https://huggingface.co/Xenova/distilbert-base-uncased-finetuned-conll03-english/resolve/main/onnx/model_quantized.onnx"
}

base_path = "backend/static/models/pii-ner/"

print("Starting download of AI model files...")
for filename, url in files.items():
    full_path = os.path.join(base_path, filename)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    print(f"Downloading {filename}...")
    urllib.request.urlretrieve(url, full_path)

print("All AI model files downloaded successfully!")
