from __future__ import annotations

import hashlib
import random
import re
from pathlib import Path

from ml.prediction.ml_model import NaiveBayesTextModel, TOKEN_NORMALIZATIONS


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "ml" / "models" / "review_model.json"
_MODEL: NaiveBayesTextModel | None = None

TOPIC_LABELS = {
    "mural_design": "mural design",
    "canvas_art": "canvas artwork",
    "art_quality": "art quality",
    "delivery": "delivery experience",
    "communication": "studio communication",
    "pricing": "pricing clarity",
    "general": "overall experience",
}

SHORT_TOPIC_LABELS = {
    "mural_design": "mural design",
    "canvas_art": "canvas artwork",
    "art_quality": "art quality",
    "delivery": "delivery",
    "communication": "communication",
    "pricing": "pricing",
    "general": "experience",
}

SMILEY_EMOJIS = [
    "😊", "😁", "😄", "🤗", "😃", "🥰", "😍", "🤩", "😌", "🙂",
    "😋", "🤠", "😎", "🥳", "😇", "☺️", "😉"
]

OPENERS = [
    "Thank you{name_part}.",
    "Thanks{name_part}.",
    "We value your feedback{name_part}.",
]

TOPIC_LINES = {
    "mural_design": [
        "We will refine the wall design with more care.",
        "We will make the mural experience smoother and more personal.",
    ],
    "canvas_art": [
        "We will make the canvas artwork more polished and personal.",
        "We will handle the custom canvas with extra care.",
    ],
    "art_quality": [
        "We will give more attention to color, detail, and finish.",
        "We will keep improving the final artwork quality.",
    ],
    "delivery": [
        "We will make the artwork delivery smoother and safer.",
        "We will improve the handover with better care.",
    ],
    "communication": [
        "We will keep future studio updates clearer and quicker.",
        "We will make the art discussion process easier.",
    ],
    "pricing": [
        "We will explain the artwork pricing more clearly.",
        "We will keep the value and customization details more transparent.",
    ],
    "general": [
        "We will make the next art experience smoother.",
        "We will keep improving the complete studio experience.",
    ],
}

REVIEW_LINES = {
    "mural_design": [
        "Your wall art feedback helps us shape every mural with more meaning.",
        "Your review helps us make each wall feel closer to your vision.",
    ],
    "canvas_art": [
        "Your canvas feedback helps us make every custom piece more memorable.",
        "Your review helps us handle each canvas with more personal care.",
    ],
    "art_quality": [
        "Your review helps us improve the colors, detailing, and final finish.",
        "Your feedback helps us make the artwork look cleaner and richer.",
    ],
    "delivery": [
        "Your delivery feedback helps us protect and hand over artwork better.",
        "Your review helps us make the artwork reach you with more care.",
    ],
    "communication": [
        "Your review helps us make every studio update clearer and warmer.",
        "Your feedback helps us guide the art journey more smoothly.",
    ],
    "pricing": [
        "Your review helps us explain the artwork value more clearly.",
        "Your feedback helps us keep pricing and customization easier to understand.",
    ],
    "general": [
        "Your review helps our studio create a better art experience.",
        "Your feedback helps us improve every step of the creative journey.",
    ],
}

BRIDGES = {
    "positive": "Happy to know the artwork connected with you.",
    "mixed": "Your note is helpful.",
    "negative": "Your note is important to us.",
}

STRONG_NEGATIVE_KEYWORDS = [
    "awful",
    "terrible",
    "worst",
    "very bad",
    "not good",
    "bad",
    "poor",
    "disappointing",
    "damaged",
    "demolished",
    "destroyed",
    "broken",
    "expected madhiri illa",
    "size sari illa",
    "reference madhiri illa",
    "finish sari illa",
    "quality sari illa",
    "satisfied illa",
]

STRONG_POSITIVE_KEYWORDS = [
    "super",
    "extraordinary",
    "amazing",
    "semma",
    "vera level",
    "nalla iruku",
    "excellent",
    "beautiful",
    "perfect",
    "worth ah",
]

CONTRAST_KEYWORDS = [
    "but",
    "however",
    "except",
    "though",
    "ana",
    "aana",
]

ACTION_PHRASES = {
    "mural_design": "refine the mural design",
    "canvas_art": "improve the canvas care",
    "art_quality": "improve the finish",
    "delivery": "make delivery smoother",
    "communication": "keep updates clearer",
    "pricing": "keep pricing clearer",
    "general": "make the next experience smoother",
}

TOPIC_KEYWORDS = {
    "mural_design": [
        "mural",
        "wall painting",
        "home painting",
        "living room wall",
        "bedroom mural",
        "design",
        "expected madhiri illa",
    ],
    "canvas_art": [
        "canvas",
        "portrait",
        "framed painting",
        "gift painting",
        "custom canvas",
        "cannvas",
        "canvaas",
        "canvass",
        "size sari illa",
        "reference madhiri illa",
        "damaged",
        "demolished",
        "destroyed",
        "broken",
    ],
    "art_quality": [
        "quality",
        "color",
        "colors",
        "detailing",
        "finish",
        "texture",
        "brush",
        "finish sari illa",
        "quality sari illa",
        "nalla quality",
    ],
    "delivery": ["delivery", "courier", "shipping", "handover", "package", "late", "delayed", "late aachu", "time ku"],
    "communication": [
        "response",
        "message",
        "call",
        "communication",
        "update",
        "reply",
        "responsive",
        "slow",
        "update varala",
        "reply late",
        "fast reply",
        "nalla response",
    ],
    "pricing": [
        "price",
        "cost",
        "rate",
        "budget",
        "pricing",
        "costly",
        "expensive",
        "high",
        "over budget",
        "worth",
        "value",
        "adhigam",
        "worth ah",
        "budget friendly",
    ],
}


def generate_artist_reply(review: str, customer_name: str | None = None) -> dict[str, object]:
    sentiment, sentiment_confidence, primary_topic, topic_confidence = predict_review_labels(review)
    topics = _detect_review_topics(review, primary_topic)

    # Always generate a positive reply - the ML detects topic but reply is always warm
    reply = _build_positive_reply(customer_name, topics, review)

    return {
        "reply": reply,
        "sentiment": "positive",
        "sentiment_confidence": sentiment_confidence,
        "topics": topics,
        "topic_confidence": topic_confidence,
        "topic_labels": [TOPIC_LABELS[topic] for topic in topics],
        "emoji": _get_random_smiley(),
        "card_title": "A warm note from our studio",
    }


def predict_review_labels(review: str) -> tuple[str, float, str, float]:
    model = _load_model()
    sentiment, sentiment_confidence = model.predict(review, "sentiment")
    topic, topic_confidence = model.predict(review, "topic")
    if _has_strong_negative_keyword(review) and not _has_contrast_keyword(review):
        sentiment = "negative"
        sentiment_confidence = max(sentiment_confidence, 0.95)
    elif _has_standalone_positive_keyword(review):
        sentiment = "positive"
        sentiment_confidence = max(sentiment_confidence, 0.95)
    return sentiment, sentiment_confidence, topic, topic_confidence


def _load_model() -> NaiveBayesTextModel:
    global _MODEL
    if _MODEL is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. Run: python ml/training/train_model.py or python scripts/train_model.py"
            )
        _MODEL = NaiveBayesTextModel.load(MODEL_PATH)
    return _MODEL


def _format_name(customer_name: str | None) -> str:
    if not customer_name:
        return ""

    clean_name = re.sub(r"[^a-zA-Z .'-]", "", customer_name).strip()
    if not clean_name:
        return ""

    formatted_name = clean_name.title()
    return f", {formatted_name}"


def _detect_review_topics(review: str, primary_topic: str) -> list[str]:
    topics = [primary_topic]
    normalized = _normalize_review_text(review)
    secondary_scores: list[tuple[int, str]] = []

    for topic, keywords in TOPIC_KEYWORDS.items():
        if topic == primary_topic:
            continue
        score = sum(1 for keyword in keywords if _contains_keyword(normalized, keyword))
        if score:
            secondary_scores.append((score, topic))

    secondary_scores.sort(key=lambda item: item[0], reverse=True)
    topics.extend(topic for _score, topic in secondary_scores[:1])

    if len(topics) > 1 and "general" in topics:
        topics.remove("general")

    return topics


def _contains_keyword(text: str, keyword: str) -> bool:
    if " " in keyword:
        return keyword in text
    return re.search(rf"\b{re.escape(keyword)}\b", text) is not None


def _has_strong_negative_keyword(review: str) -> bool:
    normalized = _normalize_review_text(review)
    return any(_contains_keyword(normalized, keyword) for keyword in STRONG_NEGATIVE_KEYWORDS)


def _has_standalone_positive_keyword(review: str) -> bool:
    normalized = _normalize_review_text(review)
    if _has_contrast_keyword(review):
        return False
    if _has_strong_negative_keyword(review):
        return False
    return any(_contains_keyword(normalized, keyword) for keyword in STRONG_POSITIVE_KEYWORDS)


def _has_contrast_keyword(review: str) -> bool:
    normalized = _normalize_review_text(review)
    return any(_contains_keyword(normalized, keyword) for keyword in CONTRAST_KEYWORDS)


def _normalize_review_text(review: str) -> str:
    normalized = review.lower()
    for source, target in TOKEN_NORMALIZATIONS.items():
        normalized = re.sub(rf"\b{re.escape(source)}\b", target, normalized)
    return normalized


def _extract_specific_feedback(review: str, topics: list[str]) -> str:
    """Extract specific complaint from review - only uses topic label, not raw text fragments"""
    topic_names = _join_words([TOPIC_LABELS[topic] for topic in topics])
    return topic_names


def _build_positive_reply(
    customer_name: str | None,
    topics: list[str],
    review: str,
) -> str:
    """Generate a short, customized positive reply based on review content."""
    name = customer_name.title() if customer_name else "valued customer"
    topic = topics[0] if topics else "general"
    topic_label = TOPIC_LABELS[topic]
    
    reply_line = _generate_reply_line(review, topic_label)
    
    return f"""Dear {name},

{reply_line}

With gratitude,
The ashmija in color Team"""


def _generate_reply_line(review: str, topic_label: str) -> str:
    """Generate a single unique reply line based on exact review content."""
    review_lower = review.lower()
    
    # Each reply is unique based on keyword combinations
    is_delivery = any(w in review_lower for w in ["delivery", "shipping", "package", "courier", "handover"])
    is_late = any(w in review_lower for w in ["late", "delayed", "time"])
    is_damage = any(w in review_lower for w in ["damage", "broken", "crack", "destroyed"])
    is_design = any(w in review_lower for w in ["design", "mural", "pattern", "motif"])
    is_quality = any(w in review_lower for w in ["quality", "finish", "texture", "brush"])
    is_color = any(w in review_lower for w in ["color", "shade", "paint"])
    is_comms = any(w in review_lower for w in ["communication", "response", "update", "message", "call"])
    is_price = any(w in review_lower for w in ["price", "cost", "budget", "expensive", "rate"])
    is_canvas = any(w in review_lower for w in ["canvas", "portrait", "frame"])
    is_positive = any(w in review_lower for w in ["amazing", "wonderful", "super", "semma", "excellent", "outstanding", "fantastic", "beautiful", "lovely", "great", "nice", "good", "perfect", "nalla", "worth", "awesome"])
    # Detect mixed reviews: contains both positive keywords AND negative/problem keywords with contrast words
    has_contrast = any(w in review_lower for w in ["but", "however", "although", "though", "ana", "aana", "except"])
    has_negative = is_damage or any(w in review_lower for w in ["satisfied illa", "sari illa", "disappointing", "poor", "bad", "worst", "terrible", "awful", "late", "delayed", "slow"])
    is_mixed = has_contrast and has_negative and is_positive
    
    # Priority 1: Damage/negative issues (even if positive keywords exist alongside contrast words like "but")
    if is_mixed:
        return f"Thank you for your honest feedback. We're sorry about the issue and will work on improving the {topic_label}."
    if is_delivery and is_damage:
        return f"We appreciate your feedback about the delivery condition. Your input helps us strengthen our packaging for future shipments."
    if is_canvas and is_damage:
        return f"Thank you for letting us know about the canvas. Every detail matters, and your feedback helps us protect our artwork better during transit."
    if is_damage:
        return f"Thank you for bringing this to our attention. We sincerely apologize and will address the quality concern immediately."
    if is_delivery and is_late:
        return f"Thank you for sharing your thoughts about our delivery. Your feedback on the timing helps us improve our logistics and serve you better."
    if is_delivery:
        return f"Thanks for your feedback on the delivery experience. We're always working to make sure your artwork arrives safely and on time."
    if is_canvas and is_quality:
        return f"We value your thoughts on the canvas quality. Your feedback directly helps our artists refine their craft."
    if is_canvas:
        return f"Thanks for sharing your experience with our canvas artwork. Your feedback helps us improve every custom piece we create."
    if is_design and is_color:
        return f"Your feedback on the design and colors is valuable. We're always refining our creative process to match your vision perfectly."
    if is_design:
        return f"Thank you for your thoughts on the design. Every mural is crafted with care, and your insights help us grow."
    if is_quality and is_color:
        return f"We appreciate your feedback on the artwork quality and colors. Our team is dedicated to delivering exceptional results."
    if is_quality:
        return f"Your feedback on the work quality is important to us. We're committed to giving every detail the attention it deserves."
    if is_comms:
        return f"Thanks for your honest feedback on communication. We're always looking for ways to keep our clients more informed."
    if is_price:
        return f"We appreciate your perspective on pricing. Your feedback helps us ensure our work remains accessible and valuable."
    
    # Positive only after all negative/mixed checks pass
    if is_positive:
        return f"We are so happy to hear you loved the work! Your kind words mean everything to our entire team."
    
    return f"Thank you for your thoughtful feedback about our {topic_label}. We truly value your perspective and use it to improve."


def _build_short_reply(
    customer_name: str | None,
    sentiment: str,
    topics: list[str],
) -> str:
    name_part = _format_name(customer_name)
    topic_names = _join_words([SHORT_TOPIC_LABELS[topic] for topic in topics])
    action = _join_words([ACTION_PHRASES[topic] for topic in topics])

    if sentiment == "positive":
        thanks = f"Thanks{name_part}," if name_part else "Thanks"
        return f"{thanks} for the kind words about {topic_names}. We will keep improving our work."
    if sentiment == "mixed":
        return f"Thanks{name_part}, your feedback about {topic_names} is helpful. We will {action}."

    return f"Thanks{name_part}, your feedback about {topic_names} is important to us. We will {action}."


def _join_words(items: list[str]) -> str:
    if len(items) == 1:
        return items[0]
    # For topic labels (short phrases like "canvas artwork" and "art quality"), join with "and"
    first = items[0]
    second = items[1]
    # If items are full sentences (end with period), join with space instead of "and"
    if first.rstrip().endswith('.') or second.rstrip().endswith('.'):
        return f"{first.rstrip('. ')}. {second}"
    if second.startswith(','):
        return f"{first}{second}"
    return f"{first} and {second}"


def _get_random_smiley() -> str:
    import random
    return random.choice(SMILEY_EMOJIS)


def _stable_choice(options: list[str], seed_text: str) -> str:
    digest = hashlib.sha256(seed_text.encode("utf-8")).hexdigest()
    index = int(digest[:8], 16) % len(options)
    return options[index]
