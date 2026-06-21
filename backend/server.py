"""
Pitch-Vision AI — FastAPI Backend Server
Bridges the frontend dashboard with IBM Granite via watsonx.ai.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uvicorn
import os

from granite_client import granite

# ============================================
# APP INITIALIZATION
# ============================================

app = FastAPI(
    title="Pitch-Vision AI Backend",
    description="IBM Granite-powered soccer tactical intelligence API",
    version="2.0.0"
)

# Allow frontend to connect from any origin (for local dev & deployment)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================
# REQUEST / RESPONSE MODELS
# ============================================

class ChatRequest(BaseModel):
    query: str
    mode: Optional[str] = "tactical"  # tactical, var, biometric

class ChatResponse(BaseModel):
    response: str
    model: str
    mode: str
    is_live: bool  # True = real API, False = demo mode

class AnalyzePlayRequest(BaseModel):
    vectors: list  # Array of {type, points: [{x, y}]}
    camera: Optional[str] = "tactical"
    match_time: Optional[str] = "82:14"

class VARExplainRequest(BaseModel):
    decision_type: str  # offside, handball, tackle
    parameters: dict    # Calibration values from frontend sliders

class PlayerCompareRequest(BaseModel):
    player_a: str
    player_b: str

class HealthResponse(BaseModel):
    status: str
    granite_connected: bool
    model_id: str
    mode: str

# ============================================
# STARTUP EVENT
# ============================================

@app.on_event("startup")
async def startup():
    """Initialize Granite client on server start."""
    granite.initialize()
    if granite.is_configured():
        print("[Server] IBM Granite API connected — LIVE mode active")
    else:
        print("[Server] No API credentials — running in DEMO mode")
        print("[Server] Set WATSONX_API_KEY and WATSONX_PROJECT_ID in .env to enable live AI")

# ============================================
# API ENDPOINTS
# ============================================

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint for frontend auto-detection."""
    return HealthResponse(
        status="online",
        granite_connected=granite._initialized,
        model_id=granite.model_id,
        mode="live" if granite._initialized else "demo"
    )

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a query to IBM Granite and get tactical analysis."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    response = granite.generate(request.query, mode=request.mode)
    
    return ChatResponse(
        response=response,
        model=granite.model_id,
        mode=request.mode,
        is_live=granite._initialized
    )

@app.post("/api/analyze-play", response_model=ChatResponse)
async def analyze_play(request: AnalyzePlayRequest):
    """Analyze a telestrator sketch drawn on the 2.5D pitch canvas."""
    
    # Build a descriptive prompt from the vector data
    sketch_descriptions = []
    for i, sketch in enumerate(request.vectors):
        sketch_type = sketch.get("type", "path")
        points = sketch.get("points", [])
        if len(points) >= 2:
            start = points[0]
            end = points[-1]
            direction = "forward" if end.get("x", 0) < start.get("x", 0) else "backward"
            sketch_descriptions.append(
                f"- {sketch_type.upper()} vector #{i+1}: from zone ({start.get('x',0):.0f}, {start.get('y',0):.0f}) "
                f"to ({end.get('x',0):.0f}, {end.get('y',0):.0f}), moving {direction}"
            )
    
    sketch_text = "\n".join(sketch_descriptions) if sketch_descriptions else "No vectors drawn"
    
    prompt = f"""Analyze this tactical telestrator sketch drawn at match time {request.match_time} 
from the {request.camera} camera angle:

{sketch_text}

Interpret the tactical intent: What play is being designed? 
What are the risks and opportunities? How would the defense likely respond?"""
    
    response = granite.generate(prompt, mode="tactical")
    
    return ChatResponse(
        response=response,
        model=granite.model_id,
        mode="tactical",
        is_live=granite._initialized
    )

@app.post("/api/var-explain", response_model=ChatResponse)
async def var_explain(request: VARExplainRequest):
    """Get an IFAB law-grounded explanation for a VAR decision."""
    
    params = request.parameters
    
    # Try to query the local IFAB rules database built via Docling
    rules_context = ""
    try:
        import chromadb
        db_path = os.path.join(os.path.dirname(__file__), "rules_db")
        if os.path.exists(db_path):
            client = chromadb.PersistentClient(path=db_path)
            collection = client.get_collection("ifab_rules")
            results = collection.query(
                query_texts=[request.decision_type],
                n_results=1
            )
            if results and "documents" in results and results["documents"] and results["documents"][0]:
                rules_context = f"\n\nRetrieved IFAB Rules context via Docling parser:\n{results['documents'][0][0]}"
                print(f"[RAG] Successfully retrieved rules context for decision check: {request.decision_type}")
    except Exception as e:
        # Rules DB not initialized yet, fall back to LLM system instructions
        pass
    
    if request.decision_type == "offside":
        offset_cm = params.get("offset_cm", -3.4)
        prompt = f"""Analyze this offside VAR check:
- Pixel delta between defender and attacker alignment: {params.get('px_delta', -15)}px
- Real distance offset: {offset_cm} cm
- The attacker's leading boot is {'behind' if offset_cm < 0 else 'ahead of'} the defender's sleeve line.
{rules_context}

Cite IFAB Law 11 and explain whether this is offside or onside. 
Include the tolerance margin used by VAR and the "clear and obvious" standard."""
    
    elif request.decision_type == "handball":
        arm_angle = params.get("arm_angle", 45)
        expansion = params.get("expansion", 8.4)
        prompt = f"""Analyze this handball VAR check:
- Player arm abduction angle: {arm_angle}°
- Body silhouette area expansion: +{expansion}%
- The player's arm was at {arm_angle}° from the torso when the ball made contact.
{rules_context}

Cite IFAB Law 12 (Handling the ball) and explain whether this constitutes a handball.
Reference the "natural silhouette" test and the unnaturally bigger standard."""
    
    elif request.decision_type == "tackle":
        velocity = params.get("velocity", 4.2)
        force_g = params.get("force_g", 3.8)
        prompt = f"""Analyze this tackle severity VAR check:
- Tackle entry velocity: {velocity} m/s
- Calculated collision force: {force_g} G
- The challenge was made with {'studs showing' if velocity > 5 else 'foot wrapped'}.
{rules_context}

Cite IFAB Law 12 and explain the distinction between careless, reckless, and excessive force.
What card would this tackle warrant?"""
    
    else:
        raise HTTPException(status_code=400, detail=f"Unknown decision type: {request.decision_type}")
    
    response = granite.generate(prompt, mode="var")
    
    return ChatResponse(
        response=response,
        model=granite.model_id,
        mode="var",
        is_live=granite._initialized
    )

@app.post("/api/player-compare", response_model=ChatResponse)
async def player_compare(request: PlayerCompareRequest):
    """Compare two players' performance using AI analysis."""
    
    prompt = f"""Compare the match performance of {request.player_a} and {request.player_b} 
in the 2022 FIFA World Cup Final (Argentina vs France).

Include:
1. Physical output comparison (distance, sprints, top speed)
2. Tactical contribution and positioning
3. Key moments and decision-making
4. Overall match rating out of 10
5. Who had the bigger impact and why

Use precise statistics and tactical terminology."""
    
    response = granite.generate(prompt, mode="tactical")
    
    return ChatResponse(
        response=response,
        model=granite.model_id,
        mode="tactical",
        is_live=granite._initialized
    )

@app.post("/api/momentum", response_model=ChatResponse)
async def analyze_momentum(request: ChatRequest):
    """Analyze momentum at a specific match minute."""
    
    prompt = f"""Analyze the match momentum at minute {request.query} of the 2022 World Cup Final.

Explain:
1. Which team controls the momentum and why
2. The Expected Threat (xT) differential
3. Key tactical factors driving the momentum
4. What the pressing intensity (PPDA) tells us
5. Prediction: what happens next based on current trajectory"""
    
    response = granite.generate(prompt, mode="tactical")
    
    return ChatResponse(
        response=response,
        model=granite.model_id,
        mode="tactical",
        is_live=granite._initialized
    )

# ============================================
# MAIN
# ============================================

if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    print(f"\n{'='*50}")
    print(f"  PITCH-VISION AI BACKEND v2.0")
    print(f"  Running on http://localhost:{port}")
    print(f"  API docs: http://localhost:{port}/docs")
    print(f"{'='*50}\n")
    
    uvicorn.run("server:app", host="0.0.0.0", port=port, reload=True)
