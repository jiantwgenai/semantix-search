from fastapi import FastAPI
from transformers import AutoTokenizer, AutoModel
import torch
from pydantic import BaseModel

app = FastAPI()
model_name = "sentence-transformers/all-MiniLM-L6-v2"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModel.from_pretrained(model_name)

class TextInput(BaseModel):
    text: str
    model: str = "default"

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.post("/embed")
def generate_embedding(input_data: TextInput):
    inputs = tokenizer(input_data.text, return_tensors="pt", padding=True, truncation=True)
    with torch.no_grad():
        outputs = model(**inputs)
    embeddings = outputs.last_hidden_state.mean(dim=1)
    return {"embedding": embeddings[0].tolist()}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000) 