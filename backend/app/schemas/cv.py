from pydantic import BaseModel

class CVUploadRequest(BaseModel):
    text: str
