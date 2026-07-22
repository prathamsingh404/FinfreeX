"""omg this is where we define the super cool backpack that our robot agents carry around!"""
from __future__ import annotations

import operator
from typing import Annotated, Any, Sequence

from langchain_core.messages import BaseMessage
from typing_extensions import TypedDict


def merge_dicts(left: dict[str, Any], right: dict[str, Any]) -> dict[str, Any]:
    """HEEY! This is our top-secret recipe for merging two dictionaries! if there's a clash the right side totally runs over the left side EXCEPT if they are both nested dictionaries then they hold hands and merge nicely!"""
    merged = left.copy()
    for key, value in right.items():
        if key in merged and isinstance(merged[key], dict) and isinstance(value, dict):
            merged[key] = merge_dicts(merged[key], value)
        else:
            merged[key] = value
    return merged


class AgentState(TypedDict):
    """OMG! This is the giant shared backpack that all our robot agents carry around! they keep their chat logs in messages, their super cool stock data in data, and their settings in metadata. whenever someone finds new info, they shove it in the backpack!"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    data: Annotated[dict, merge_dicts]
    metadata: Annotated[dict, merge_dicts]
