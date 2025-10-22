import os
import json
from dotenv import load_dotenv
from openai import OpenAI

from .base import LanguageModel

class GPT3(LanguageModel):
    def __init__(self):
        super().__init__(type="cloud")
        load_dotenv()
        self.model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is not set")
        self.client = OpenAI(api_key=api_key)

    @staticmethod
    def _to_str(x) -> str:
        if isinstance(x, str):
            return x
        try:
            return json.dumps(x, ensure_ascii=False)
        except Exception:
            return str(x)

    def _normalize_context(self, ctx):
        # allow dict or list or None; always return list
        if ctx is None:
            return []
        if isinstance(ctx, dict):
            return [ctx]
        return ctx

    def prompt_wrapper(self, text) -> list:
        """
        text (dict):
          {
            "value": "10 hrs",
            "guidance": "Convert duration to total minutes as an integer.",
            "context": {"dirty": "13 hrs and 8 min", "clean": 788}  # dict or list ok
          }
        """
        if isinstance(text, dict):
            text = dict(text)  # shallow copy
            text["context"] = self._normalize_context(text.get("context"))

        sys = (
            "You are a data-cleaning assistant.\n"
            "Input JSON has: value, guidance, context.\n"
            "- guidance tells how to clean.\n"
            "- context gives examples of dirty→clean.\n"
            "- Use both to clean the value.\n"
            'Return STRICT JSON on ONE line using DOUBLE quotes exactly as:\n'
            '{"value": <cleaned_value>, "table_name": "", "row_number": "", "object_id": ""}\n'
            'No extra text.'
        )


        return [
            {"role": "system", "content": sys},  # keep as plain text
            {"role": "user",   "content": self._to_str(text)},  # stringify input JSON
        ]

    def generate(self, text, retrieved: list):
        try:
            resp = self.client.chat.completions.create(
                model=self.model,
                messages=text,
                temperature=0,
                max_tokens=64,
            )
            # print("messages: ", messages)
            content = resp.choices[0].message.content
            # return {
            #     "value": content.strip(),
            #     "citation": retrieved  # directly attach retrieved list here
            # }
            return self.extract_value_citation(content, retrieved)
        except Exception as e:
            print("ERROR IN GENERATE", str(e))
            return {"status": "fail", "message": str(e)}


