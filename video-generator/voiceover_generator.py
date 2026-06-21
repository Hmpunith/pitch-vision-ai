import asyncio
import json
import os
from edge_tts import Communicate
from mutagen.mp3 import MP3

VOICE = "en-US-ChristopherNeural"  # Premium professional male voice

# Expanded scripts for all 8 acts to reach exactly 3 minutes (180 seconds)
ACTS = {
    "act1": (
        "Tactical analysis is often siloed in disconnected data feeds. "
        "Pitch-Vision AI connects and explains it all."
    ),
    "act2": (
        "Our multi-agent system powered by IBM Granite orchestrates micro-agents "
        "to deliver explainable tactical intelligence."
    ),
    "act3": (
        "Inside the Command Center, IBM Granite serves as the cognitive core, processing live ten-Hertz positional telemetry. "
        "Notice how Granite instantly identifies tactical degradation. It doesn't just calculate momentum loss; "
        "it isolates the precise root cause—like a defensive compactness breakdown stretching the gap between center-backs by six point four meters. "
        "The dashboard also highlights our Expected Goals timeline and decision confidence, currently running at ninety-four point eight percent consensus."
    ),
    "act4": (
        "As an active assistant, analysts can query the IBM Granite Cognitive Oracle in natural language. "
        "By parsing the optical tracking vectors, Granite delivers a hyper-specific, explainable breakdown of "
        "formation changes, pressing intensity drops, and tactical vulnerabilities in real time. "
        "Analysts can ask about complex rules, tactical shifts, or offside decisions, and receive instant, explainable "
        "breakdowns grounded in live tracking vectors."
    ),
    "act5": (
        "Next, our interactive Telestrator and VAR Calibration Lab. Analysts can sketch run vectors directly onto "
        "the two point five D isometric pitch to receive real-time play analysis. In the VAR Lab, we can calibrate "
        "guidelines and measure offside offsets, with Granite automatically retrieving the exact IFAB Laws of the Game "
        "using our built-in RAG compliance pipeline. Our VAR Calibration interface enables manual pixel-level alignment of "
        "skeletal positions. When attacker guidelines are dragged, the system calculates sub-pixel relative displacement and "
        "checks it against IFAB regulations."
    ),
    "act6": (
        "Under the Biometrics tab, we monitor real-time player strain and fatigue. By cross-referencing biometric telemetry, "
        "the platform calculates muscle load, hydration loss, and heart rate. Analysts can compare players side-by-side "
        "to predict exhaustion curves and optimize tactical substitutions. This biometrics overlay gives coaching staff "
        "objective wear-and-tear metrics, helping avoid cardiorespiratory fatigue and preventing soft tissue injuries."
    ),
    "act7": (
        "Exposing the raw topology, our Agent Network shows the distributed computational load of our five independent micro-agents. "
        "They stream positional vectors, parse biometrics, calculate threat deltas, and cross-reference rules—feeding back "
        "to the Granite Core with sub-fifty millisecond latency."
    ),
    "act8": (
        "By unifying tracking, biometrics, and tactical rules under a single cognitive engine, we redefine how "
        "the beautiful game is understood. Every match tells a story. Pitch-Vision AI explains it. Thank you."
    )
}

async def generate_voiceover():
    os.makedirs("audio", exist_ok=True)
    durations = {}
    
    print("Starting voiceover generation...")
    for act_id, text in ACTS.items():
        output_file = f"audio/{act_id}.mp3"
        
        # Skip if file already exists with content
        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            print(f"Skipping {act_id} (already generated).")
            audio = MP3(output_file)
            duration_ms = int(audio.info.length * 1000)
            durations[act_id] = duration_ms
            continue
            
        print(f"Generating voiceover for {act_id}...")
        communicate = Communicate(text, VOICE)
        await communicate.save(output_file)
        
        # Calculate duration
        audio = MP3(output_file)
        duration_ms = int(audio.info.length * 1000)
        durations[act_id] = duration_ms
        print(f"Generated {output_file} ({duration_ms} ms)")
        
    with open("durations.json", "w") as f:
        json.dump(durations, f, indent=4)
    print("All voiceovers generated successfully. Durations saved to durations.json.")

if __name__ == "__main__":
    asyncio.run(generate_voiceover())
