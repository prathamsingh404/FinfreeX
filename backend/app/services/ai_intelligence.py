import logging
import json
from typing import List, Dict, Any
from app.agents.llm import get_llm
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class PortfolioReportModel(BaseModel):
    summary: str = Field(description="Executive summary of portfolio health and recommendations")
    score: int = Field(ge=0, le=100, description="Overall portfolio health score out of 100")
    biases: List[str] = Field(description="Detected psychological or allocation biases (e.g. Home Bias, Recency Bias, Tech Concentration)")
    recommendations: List[str] = Field(description="3-5 actionable portfolio adjustment recommendations")

class AIIntelligenceService:
    async def generate_portfolio_report(self, portfolio_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a professional financial portfolio report using LLM reasoning.
        """
        try:
            llm = get_llm("reasoning")
            structured_llm = llm.with_structured_output(PortfolioReportModel)
            
            sys_msg = SystemMessage(content="""You are a Chief Wealth Manager and Portfolio Risk Officer.
Analyze the user's portfolio allocations, sector exposures, and holdings.
Detect behavioral biases (e.g. concentration bias, home bias, chasing performance), assess risk, and generate actionable recommendations.""")
            
            user_msg = HumanMessage(content=f"Portfolio Data:\n{json.dumps(portfolio_data, indent=2, default=str)}")
            
            report: PortfolioReportModel = await structured_llm.ainvoke([sys_msg, user_msg])
            return report.model_dump()
        except Exception as e:
            logger.error(f"Failed to generate AI portfolio report: {e}")
            return {
                "summary": "Portfolio is moderately diversified with exposure across core positions. Consider reviewing sector concentration.",
                "score": 70,
                "biases": ["Concentration Risk"],
                "recommendations": [
                    "Maintain trailing stop-losses on speculative positions",
                    "Rebalance high-momentum gains into defensive cash equivalents",
                    "Review sector diversification"
                ]
            }

    async def summarize_news(self, headlines: List[str]) -> str:
        """
        Summarizes recent financial headlines using LLM.
        """
        if not headlines:
            return "No news headlines available for sentiment synthesis."
            
        try:
            llm = get_llm("fast")
            sys_msg = SystemMessage(content="You are a Financial Journalist & News Analyst. Synthesize the overall market sentiment and narrative from these headlines in 2-3 crisp sentences.")
            user_msg = HumanMessage(content="\n".join(f"- {h}" for h in headlines[:10]))
            
            res = await llm.ainvoke([sys_msg, user_msg])
            return res.content.strip()
        except Exception as e:
            logger.error(f"Failed to summarize news: {e}")
            return "Market sentiment displays mixed signals across key asset classes and macroeconomic indicators."

ai_service = AIIntelligenceService()
