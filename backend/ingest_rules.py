"""
Docling Ingestion Engine for Pitch-Vision AI
Ingests the official IFAB Laws of the Game PDF into ChromaDB for Granite-powered RAG checks.
"""

import os
from dotenv import load_dotenv

load_dotenv()

def ingest_ifab_rules():
    print("==========================================================")
    print("   Pitch-Vision AI: Docling RAG Ingestion Engine Initializing")
    print("==========================================================")
    
    # 1. Official IFAB Laws of the Game URL or Local File
    rules_pdf_path = os.path.join(os.path.dirname(__file__), "laws_of_the_game.pdf")
    
    # Check if local PDF exists, if not use the official IFAB URL
    if os.path.exists(rules_pdf_path):
        source = rules_pdf_path
        print(f"[Docling] Found local rules document: {source}")
    else:
        # Fallback to public PDF URL for Law 11 & 12 details
        source = "https://www.theifab.com/document/share/1234/laws_of_the_game_2022_23.pdf"
        print(f"[Docling] Ingesting from official IFAB portal: {source}")
        
    print("[Docling] Launching DocumentConverter to parse structural PDF...")
    try:
        from docling.document_converter import DocumentConverter
        
        converter = DocumentConverter()
        result = converter.convert(source)
        markdown_content = result.document.export_to_markdown()
        print("[Docling] SUCCESS: PDF parsed into clean structured Markdown.")
        
    except ImportError:
        print("[Docling] docling package not installed. Running in simulator fallback mode...")
        # Simulating docling parsing the rules:
        markdown_content = """# IFAB Law 11 - Offside
## 11.1 Offside position
It is not an offence to be in an offside position.
A player is in an offside position if:
- any part of the head, body or feet is in the opponents' half (excluding the halfway line) and
- any part of the head, body or feet is nearer to the opponents' goal line than both the ball and the second-last opponent.

The hands and arms of all players, including the goalkeepers, are not considered. For the purposes of determining offside, the upper boundary of the arm is in line with the bottom of the armpit.

## 11.2 Offside offence
A player in an offside position at the moment the ball is played or touched by a teammate is only penalized on becoming involved in active play by:
- interfering with play by playing or passing a ball played or touched by a teammate or
- interfering with an opponent or
- gaining an advantage by playing the ball or interfering with an opponent.

# IFAB Law 12 - Fouls and Misconduct
## 12.1 Direct free kick
A direct free kick is awarded if a player commits any of the following offences against an opponent in a manner considered by the referee to be careless, reckless or using excessive force:
- charges, jumps at, kicks or attempts to kick, pushes, strikes or attempts to strike (including head-butt), tackles or challenges, trips or attempts to trip.

## 12.2 Handling the ball (Handball)
For the purposes of determining handball offences, the upper boundary of the arm is in line with the bottom of the armpit. Not every touch of a player's hand/arm with the ball is an offence.
It is an offence if a player:
- deliberately touches the ball with their hand/arm, for example moving the hand/arm towards the ball
- touches the ball with their hand/arm when it has made their body unnaturally bigger. A player is considered to have made their body unnaturally bigger when the position of their hand/arm is not a consequence of, or justifiable by, the player's body movement for that specific situation. By having their hand/arm in such a position, the player takes a risk of their hand/arm being hit by the ball and penalized.
"""
        print("[Docling Simulator] Simulated parsing of IFAB Law 11 & 12 successfully.")

    # 2. Initialize Chroma Vector DB
    print("[ChromaDB] Initializing rules vector collection...")
    try:
        import chromadb
        client = chromadb.PersistentClient(path=os.path.join(os.path.dirname(__file__), "rules_db"))
        collection = client.get_or_create_collection("ifab_rules")
        
        # Chunk and load rules
        chunks = markdown_content.split("\n\n")
        ids = [f"law_chunk_{i}" for i in range(len(chunks))]
        metadatas = [{"source": "IFAB Laws 2022/2023"} for _ in chunks]
        
        # Adding to collection
        collection.add(
            documents=chunks,
            ids=ids,
            metadatas=metadatas
        )
        print(f"[ChromaDB] SUCCESS: Indexed {len(chunks)} rule chunks parsed by Docling.")
        
    except Exception as e:
        print(f"[ChromaDB] Failed to index rules database: {e}")

if __name__ == "__main__":
    ingest_ifab_rules()
