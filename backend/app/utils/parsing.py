import pdfplumber
import io

def extract_text_from_pdf(file_bytes: bytes) -> str:
    """
    Opens a PDF file from memory and extracts all text.
    """
    text_content = ""
    
    # Wrap the bytes in a stream so pdfplumber can read it
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            # Extract text from each page and add a newline
            page_text = page.extract_text()
            if page_text:
                text_content += page_text + "\n"
                
    return text_content