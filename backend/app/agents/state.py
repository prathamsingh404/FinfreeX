from typing import TypedDict, List, Dict, Any, Annotated
import operator

class AgentState(TypedDict):
    ticker: str
    exchange: str
    underlying_price: float
    market_data: Dict[str, Any]
    indicators: Dict[str, Any]
    news: List[Dict[str, Any]]
    
    # Active specialists and their evaluations
    active_personas: List[str]
    analyst_reports: Annotated[Dict[str, Dict[str, Any]], operator.ior]
    
    # Combined results
    final_verdict: Dict[str, Any]
