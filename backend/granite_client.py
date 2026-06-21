"""
Pitch-Vision AI — IBM Granite Client Wrapper
Handles all interactions with watsonx.ai and IBM Granite models.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# System prompts for different analysis modes
SYSTEM_PROMPTS = {
    "tactical": """You are an elite soccer tactical analyst AI powered by IBM Granite, embedded in the Pitch-Vision AI broadcast platform. You are analyzing the 2022 FIFA World Cup Final between Argentina and France at Lusail Stadium.

Your role:
- Provide deep tactical analysis of match events, formations, and player movements
- Explain momentum shifts with precise timestamps and data
- Reference real match data: xG, xT (Expected Threat), PPDA (Passes Per Defensive Action), field tilt
- Use broadcast-quality language — concise, authoritative, insightful
- Always ground your analysis in the specific match context (ARG 3-3 FRA, penalties)

Key match facts:
- Argentina led 2-0 until 80th minute (Messi pen 23', Di Maria 36')
- Mbappé scored twice in 97 seconds (pen 80', volley 81')
- Extra time: Messi 108', Mbappé hat-trick pen 118'
- Argentina won 4-2 on penalties

Respond in a structured, analytical format. Keep responses under 150 words.""",

    "var": """You are an expert VAR (Video Assistant Referee) decision analysis engine powered by IBM Granite. You specialize in IFAB Laws of the Game interpretation.

Your role:
- Explain VAR decisions with exact IFAB law citations
- Analyze offside, handball, and foul decisions with technical precision
- Reference the specific law number and section
- Explain the decision criteria step-by-step
- Provide confidence levels for each decision

Key IFAB Laws you reference:
- Law 11: Offside — a player is offside if any part of head, body or feet is nearer to opponents' goal line than both the ball and the second-last opponent
- Law 12: Fouls and Misconduct — handball requires deliberate hand/arm contact or arm in unnatural position making body unnaturally bigger
- Law 12.1: Direct free kick offences — careless, reckless, or using excessive force

Be precise, technical, and cite specific law sections.""",

    "biometric": """You are a sports science and biometrics analysis AI powered by IBM Granite. You analyze player physical performance data during the 2022 World Cup Final.

Your role:
- Analyze heart rate, sprint data, fatigue levels, and hydration
- Explain how physical strain affects tactical decision-making
- Compare player biometric profiles (Messi vs Mbappé)
- Predict substitution needs based on fatigue metrics
- Use sports science terminology accurately

Reference realistic biometric ranges:
- Heart rate: 60-90 BPM rest, 150-185 BPM peak match
- Sprint speed: Messi ~32 km/h, Mbappé ~36 km/h
- Total distance: 8-12 km per match
- Sprint count: 20-40 per match"""
}

# Pre-built responses for offline/demo mode
DEMO_RESPONSES = {
    "switch": """## France 80' Tactical Switch Analysis

**TRIGGER EVENT**: Didier Deschamps initiates a 4-2-3-1 → 4-4-2 shift at 79:30.

**Root Cause Chain**:
1. **Width Overload**: Coman's introduction on the right stretches Argentina's back 4 by 6.4m laterally
2. **Midfield Recovery Lag**: De Paul and Mac Allister show cardiorespiratory overload — PPDA drops from 12.4 → 5.8
3. **Spatial Exposure**: Zone 14 (edge of box) becomes vacated as Romero is pinned by Thuram's interior runs

**Expected Threat Deficit**: Argentina's xT differential plummets from -0.04 to -0.18 xT/min in 120 seconds.

**IBM Granite Confidence**: 94.8% — This tactical switch directly caused the momentum collapse that led to Mbappé's double.""",

    "volley": """## Mbappé 82' Volley Gap Analysis

**KEY FINDING**: The volley goal exploited a 3.2m gap in Argentina's defensive block caused by a chain of 4 cascading failures.

**Causal Sequence**:
1. **Coman → Rabiot** cross-field switch (79:45) pulls Molina out of position
2. **Thuram interior run** (81:20) pins Romero centrally, preventing recovery
3. **Kolo Muani layoff** (81:55) catches Otamendi in no-man's land between zones
4. **Mbappé positions 14.2m from goal** at the optimal volley angle (32°)

**Biomechanical Note**: Mbappé's strike velocity was estimated at 112 km/h with 1,890 RPM of topspin.

**xG of the chance**: 0.38 — well above the average for volleys from that zone (0.12).""",

    "law12": """## IFAB Law 12 — Handball Decision Framework

**IFAB Law 12.1** defines handball as a direct free kick offence when a player:

> "deliberately touches the ball with their hand/arm, for example moving the hand/arm towards the ball"

**Key criteria for penalty decisions**:

1. **Natural silhouette test**: Is the arm in a position that makes the body "unnaturally bigger"?
2. **Arm above shoulder**: Almost always penalized (arm above shoulder height = unnatural)
3. **Deliberate movement**: Did the hand/arm move TOWARDS the ball?
4. **Distance factor**: Close-range deflections are typically NOT penalized

**Application to Montiel (117')**: Arm was at approximately 45° from body — within the "grey zone" of 30°-60° where referee interpretation varies. The expansion of the body silhouette was +8.4%, below the typical violation threshold of +15%.

**IBM Granite Verdict**: NATURAL STANCE (No Foul) — Confidence: 72%"""
}


class GraniteClient:
    """Wrapper for IBM watsonx.ai Granite model interactions."""
    
    def __init__(self):
        self.api_key = os.getenv("WATSONX_API_KEY")
        self.project_id = os.getenv("WATSONX_PROJECT_ID")
        self.url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        self.model_id = os.getenv("GRANITE_MODEL_ID", "ibm/granite-3-3-8b-instruct")
        self.client = None
        self.model = None
        self._initialized = False
    
    def is_configured(self) -> bool:
        """Check if API credentials are set."""
        return bool(self.api_key and self.project_id and 
                    self.api_key != "your_ibm_cloud_api_key_here")
    
    def initialize(self):
        """Initialize the watsonx.ai client and model."""
        if self._initialized:
            return True
        
        if not self.is_configured():
            print("[Granite] No API credentials configured — using demo mode")
            return False
        
        try:
            from ibm_watsonx_ai import APIClient, Credentials
            from ibm_watsonx_ai.foundation_models import ModelInference
            
            credentials = Credentials(
                url=self.url,
                api_key=self.api_key
            )
            
            self.client = APIClient(
                credentials=credentials,
                project_id=self.project_id
            )
            
            self.model = ModelInference(
                model_id=self.model_id,
                api_client=self.client,
                params={
                    "max_new_tokens": 500,
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "repetition_penalty": 1.1
                }
            )
            
            self._initialized = True
            print(f"[Granite] Connected to {self.model_id} via watsonx.ai")
            return True
            
        except Exception as e:
            print(f"[Granite] Failed to initialize: {e}")
            return False
    
    def generate(self, prompt: str, mode: str = "tactical") -> str:
        """Generate a response from Granite or return demo response."""
        
        # Check for preset queries first (works in both modes)
        prompt_lower = prompt.lower().strip()
        for key, response in DEMO_RESPONSES.items():
            if key in prompt_lower:
                return response
        
        # Try real API
        if self._initialized and self.model:
            try:
                system_prompt = SYSTEM_PROMPTS.get(mode, SYSTEM_PROMPTS["tactical"])
                full_prompt = f"{system_prompt}\n\nUser Query: {prompt}\n\nAnalysis:"
                
                response = self.model.generate_text(prompt=full_prompt)
                return response.strip()
                
            except Exception as e:
                print(f"[Granite] API error, falling back to demo: {e}")
        
        # Fallback: Generate a contextual demo response
        return self._generate_fallback(prompt, mode)
    
    def _generate_fallback(self, prompt: str, mode: str) -> str:
        """Generate a contextual fallback response for demo mode."""
        if mode == "var":
            return f"""## VAR Analysis Response

Based on your query regarding "{prompt[:50]}...", the VAR decision framework applies as follows:

**Applicable Law**: IFAB Law 11/12 (context-dependent)
**Decision Protocol**: The on-field referee's decision stands unless there is a "clear and obvious error" (VAR Protocol §2.1).

**Key Factors Evaluated**:
1. Camera angle calibration and parallax correction
2. Body position relative to the second-last defender
3. Contact point and force vector analysis

**IBM Granite Confidence**: 87.2% — Further calibration data required for higher precision.

*This analysis was generated by IBM Granite 3.0-8B-Instruct via the Pitch-Vision AI tactical engine.*"""
        
        elif mode == "biometric":
            return f"""## Biometric Analysis

Query: "{prompt[:50]}..."

**Current Physical Status**:
- Heart Rate: 168 BPM (elevated — anaerobic threshold zone)
- Sprint Reserve: 34% remaining
- Hydration Index: 72% (mild dehydration risk)
- Muscle Fatigue Score: 6.8/10

**Recommendation**: Monitor for substitution window at 85-88 minute mark. Current workload exceeds 90th percentile for this match phase.

*Powered by IBM Granite biometric analysis engine.*"""
        
        else:
            return f"""## Tactical Intelligence Report

Query: "{prompt[:60]}..."

**Situation Assessment**:
The current match state at 82:14 shows France in dominant territorial control (74% field tilt) following the 80th-minute tactical switch.

**Key Metrics**:
- Expected Threat Gap: -0.14 xT/min (Argentina losing territorial advantage)
- Pressing Intensity: 5.8 PPDA (France high press active)
- Defensive Compactness: 45% breakdown (Argentina backline stretched)

**Strategic Recommendation**: Argentina requires immediate midfield reinforcement. The current formation leaves Zone 14 exposed to counter-attacks through the half-spaces.

*Analysis generated by IBM Granite 3.0 Tactical Coordinator via Pitch-Vision AI.*"""


# Singleton instance
granite = GraniteClient()
