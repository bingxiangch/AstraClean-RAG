import os
from ollama import Client

from .base import LanguageModel


class Llama3_1(LanguageModel):

    def __init__(self):
        super().__init__(type="local")
        self.model = "llama3.1:8b-instruct-q4_K_M"
        self.client = Client(host=os.getenv("OLLAMA_URL"))

    def prompt_wrapper(self, text: str) -> list:
        messages = [
            {
                "role": "system",
                "content":
                    "You are a data-cleaning assistant.\n"
                    "Input JSON has: value, guidance, context.\n"
                    "- guidance tells how to clean.\n"
                    "- context gives examples of dirty→clean.\n"
                    "- Use both to clean the value.\n"
                    'Return STRICT JSON on ONE line using DOUBLE quotes exactly as:\n'
                    '{"value": <cleaned_value>, "table_name": "", "row_number": "", "object_id": ""}\n'
                    'No extra text.'
            },
            {"role": "user", "content": text},
        ]
        return messages



    def generate(self, text: str, retrieved: list) -> str:
        try:
            response = self.client.chat(
                model=self.model,
                messages=text,
                keep_alive="10m",
            )
            print('text:', text)
            print("response: ", response)

            return self.extract_value_citation(
                response["message"]["content"], retrieved
            )
        except Exception as e:
            print("ERROR IN GENERATE", str(e))
            return {"status": "fail", "message": str(e)}
