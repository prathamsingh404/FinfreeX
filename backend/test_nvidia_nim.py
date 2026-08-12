"""Standalone test script for NVIDIA NIM Nemotron-3.5 model streaming."""
import os
import sys
from openai import OpenAI

def main():
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        print("Error: NVIDIA_API_KEY environment variable not set.")
        sys.exit(1)

    print("Initializing NVIDIA NIM Client...")
    client = OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=api_key
    )

    prompt = sys.argv[1] if len(sys.argv) > 1 else "Explain stock market valuation multiples (P/E, P/B, EV/EBITDA) concisely."
    print(f"Prompt: {prompt}\n--- Response ---")

    try:
        completion = client.chat.completions.create(
            model="nvidia/nemotron-3.5-lightning-30b-a3b",
            messages=[{"role": "user", "content": prompt}],
            temperature=1,
            top_p=0.95,
            max_tokens=16384,
            extra_body={"chat_template_kwargs": {"enable_thinking": True}, "reasoning_budget": 16384},
            stream=True
        )

        for chunk in completion:
            if not chunk.choices:
                continue
            reasoning = getattr(chunk.choices[0].delta, "reasoning_content", None)
            if reasoning:
                print(reasoning, end="", flush=True)
            if chunk.choices[0].delta.content is not None:
                print(chunk.choices[0].delta.content, end="", flush=True)
        print("\n--- Done ---")
    except Exception as e:
        print(f"\nError invoking NVIDIA NIM: {e}")

if __name__ == "__main__":
    main()
