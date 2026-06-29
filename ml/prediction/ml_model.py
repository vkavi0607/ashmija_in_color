from __future__ import annotations

import csv
import json
import math
import re
from collections import Counter, defaultdict
from pathlib import Path


TOKEN_RE = re.compile(r"[a-zA-Z][a-zA-Z']+")
MODEL_VERSION = "mural-art-nb-v1"

TOKEN_NORMALIZATIONS = {
    "canvaas": "canvas",
    "cannvas": "canvas",
    "canvass": "canvas",
    "demolished": "damaged",
    "destroyed": "damaged",
    "broke": "broken",
}


class NaiveBayesTextModel:
    def __init__(self, label_models: dict[str, dict[str, object]]) -> None:
        self.label_models = label_models

    def predict(self, text: str, target: str) -> tuple[str, float]:
        model = self.label_models[target]
        labels = model["labels"]
        label_doc_counts = model["label_doc_counts"]
        label_token_counts = model["label_token_counts"]
        token_counts = model["token_counts"]
        vocabulary = set(model["vocabulary"])
        total_docs = sum(label_doc_counts.values())
        vocab_size = max(len(vocabulary), 1)
        tokens = tokenize(text)

        scores: dict[str, float] = {}
        for label in labels:
            prior = (label_doc_counts[label] + 1) / (total_docs + len(labels))
            score = math.log(prior)
            denominator = label_token_counts[label] + vocab_size
            label_tokens = token_counts[label]

            for token in tokens:
                if token not in vocabulary:
                    continue
                score += math.log((label_tokens.get(token, 0) + 1) / denominator)
            scores[label] = score

        predicted = max(scores, key=scores.get)
        confidence = softmax_confidence(scores, predicted)
        return predicted, round(confidence, 4)

    def save(self, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps(
                {
                    "version": MODEL_VERSION,
                    "label_models": self.label_models,
                },
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )

    @classmethod
    def load(cls, path: Path) -> "NaiveBayesTextModel":
        data = json.loads(path.read_text(encoding="utf-8"))
        return cls(label_models=data["label_models"])


def train_from_csv(dataset_path: Path) -> NaiveBayesTextModel:
    rows = list(read_dataset(dataset_path))
    return train_from_rows(rows)


def train_from_rows(rows: list[dict[str, str]]) -> NaiveBayesTextModel:
    if not rows:
        raise ValueError("Training dataset is empty")

    return NaiveBayesTextModel(
        {
            "sentiment": build_label_model(rows, "sentiment"),
            "topic": build_label_model(rows, "topic"),
        }
    )


def read_dataset(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as file:
        reader = csv.DictReader(file)
        required = {"review", "sentiment", "topic"}
        if set(reader.fieldnames or []) < required:
            raise ValueError("Dataset must contain review, sentiment, and topic columns")
        return [
            {
                "review": row["review"].strip(),
                "sentiment": row["sentiment"].strip(),
                "topic": row["topic"].strip(),
            }
            for row in reader
            if row.get("review", "").strip()
        ]


def build_label_model(rows: list[dict[str, str]], target: str) -> dict[str, object]:
    labels = sorted({row[target] for row in rows})
    label_doc_counts: Counter[str] = Counter()
    label_token_counts: Counter[str] = Counter()
    token_counts: dict[str, Counter[str]] = defaultdict(Counter)
    vocabulary: set[str] = set()

    for row in rows:
        label = row[target]
        tokens = tokenize(row["review"])
        label_doc_counts[label] += 1
        label_token_counts[label] += len(tokens)
        token_counts[label].update(tokens)
        vocabulary.update(tokens)

    return {
        "labels": labels,
        "label_doc_counts": dict(label_doc_counts),
        "label_token_counts": dict(label_token_counts),
        "token_counts": {label: dict(counts) for label, counts in token_counts.items()},
        "vocabulary": sorted(vocabulary),
    }


def tokenize(text: str) -> list[str]:
    words = [
        TOKEN_NORMALIZATIONS.get(token.lower().strip("'"), token.lower().strip("'"))
        for token in TOKEN_RE.findall(text)
    ]
    bigrams = [f"{left}_{right}" for left, right in zip(words, words[1:])]
    trigrams = [
        f"{first}_{second}_{third}"
        for first, second, third in zip(words, words[1:], words[2:])
    ]
    return words + bigrams + trigrams


def softmax_confidence(scores: dict[str, float], predicted: str) -> float:
    max_score = max(scores.values())
    exp_scores = {label: math.exp(score - max_score) for label, score in scores.items()}
    total = sum(exp_scores.values())
    return exp_scores[predicted] / total if total else 0.0
