from pypdf import PdfReader

try:
    reader = PdfReader("10953354_PID.pdf")
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"

    with open("pid_content.txt", "w", encoding="utf-8") as f:
        f.write(text)

    print("Text extracted to pid_content.txt")
except Exception as e:
    print(f"Error: {e}")
