from fastembed import TextEmbedding
import numpy as np
from cache import load_cache, save_cache
from .paths import FASTEMBED_PATH

DOWNLOAD_URLS = [
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/model_optimized.onnx?download=true",
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/tokenizer_config.json?download=true",
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/tokenizer.json?download=true",
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/vocab.txt?download=true",
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/special_tokens_map.json?download=true",
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/ort_config.json?download=true",
    "https://huggingface.co/Qdrant/bge-small-en-v1.5-onnx-Q/resolve/main/config.json?download=true",
]

class Memory:
    MEM_CACHE_KEY = "user_memory"
    SIMILARITY_THRESHOLD = 0.60

    def __init__(self):
        self.embed_model = TextEmbedding(
            model_name="BAAI/bge-small-en-v1.5",
            specific_model_path=str(FASTEMBED_PATH),
            local_files_only=True,
        )
        self.memories = []
        self._load_memory()

    def _embed_text(self, text: str):
        return next(self.embed_model.embed([text])) #type: ignore

    def add(self, text: str):
        embedding = self._embed_text(text)

        for memory in self.memories:
            similarity = self._similarity(
                embedding,
                memory["embedding"],
            )

            if similarity >= self.SIMILARITY_THRESHOLD:
                return False

        self.memories.append({
            "text": text,
            "embedding": embedding,
        })

        self.save_memories()
        return True

    def _search(self, query: str, limit: int = 3):
        query_embedding = self._embed_text(query)

        results = [
            (
                self._similarity(
                    query_embedding,
                    memory["embedding"],
                ),
                memory["text"],
            )
            for memory in self.memories
        ]

        results.sort(
            key=lambda item: item[0],
            reverse=True,
        )

        return results[:limit]

    @staticmethod
    def _similarity(a, b):
        return float(
            a @ b
            / ((a @ a) ** 0.5 * (b @ b) ** 0.5)
        )

    def _load_memory(self):
        cached = load_cache(self.MEM_CACHE_KEY, default=[])

        if isinstance(cached, list):
            self.memories = cached
            for memory in self.memories:
                memory["embedding"] = np.asarray(
                    memory["embedding"],
                    dtype=np.float32,
                )

    def save_memories(self):
        save_cache( #type: ignore 
            self.MEM_CACHE_KEY,
            [
                {
                    "text": memory["text"],
                    "embedding": memory["embedding"].tolist(),
                }
                for memory in self.memories
            ],
        ) 

    def get_memory(self, user_prompt: str):
        memories = self._search(user_prompt)

        relevant = [
            text
            for score, text in memories
            if score >= self.SIMILARITY_THRESHOLD
        ]

        memory_text = "\n".join(
            f"- {text}"
            for text in relevant
        )

        if memory_text:
            return memory_text
