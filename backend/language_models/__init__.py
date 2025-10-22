from .language_model_gpt3 import GPT3
from .language_model_llama3_1 import Llama3_1
# Map model names to their respective classes
MODEL_MAP = {"GPT-3.5": GPT3, "Llama 3.1": Llama3_1}
