from fastapi import FastAPI
app=FastAPI(title="ai-knowledge-worker",version="0.1.0")
@app.get("/health")
async def health():
    return {"status":"ok","version":"0.1.0"}

