import re
from typing import Dict, Any

# Financial sentiment keyword weights
SENTIMENT_WORDS = {
    # Bullish indicators
    "growth": 1.5,
    "profit": 1.5,
    "bullish": 2.0,
    "upgrade": 2.0,
    "record": 1.2,
    "dividend": 1.0,
    "gains": 1.2,
    "outperform": 1.8,
    "acquisition": 1.2,
    "surge": 1.5,
    "positive": 1.0,
    "expand": 1.2,
    "recovery": 1.2,
    
    # Bearish indicators
    "loss": -1.5,
    "drop": -1.2,
    "bearish": -2.0,
    "downgrade": -2.0,
    "deficit": -1.5,
    "inflation": -1.0,
    "slump": -1.5,
    "contraction": -1.2,
    "risk": -1.0,
    "decline": -1.2,
    "negative": -1.0,
    "debt": -0.8,
    "investigation": -1.5
}

def analyze_sentiment(text: str) -> Dict[str, Any]:
    """
    Perform financial text sentiment analysis.
    Returns score and classification.
    """
    if not text:
        return {"sentiment": "Neutral", "score": 0.0}
        
    text_lower = text.lower()
    score = 0.0
    matches = 0
    
    for word, weight in SENTIMENT_WORDS.items():
        # Match word as a whole word or substring
        count = len(re.findall(rf"\b{word}\w*\b", text_lower))
        if count > 0:
            score += weight * count
            matches += count
            
    # Normalize score
    if matches > 0:
        normalized_score = score / matches
    else:
        normalized_score = 0.0
        
    # Classify sentiment
    if normalized_score > 0.25:
        sentiment = "Bullish"
    elif normalized_score < -0.25:
        sentiment = "Bearish"
    else:
        sentiment = "Neutral"
        
    return {
        "sentiment": sentiment,
        "score": round(normalized_score, 2),
        "matches": matches
    }
