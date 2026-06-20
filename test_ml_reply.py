#!/usr/bin/env python3
"""
ML Reply Engine - Customer Review Response Generator
Demonstrates how the ML model generates personalized replies based on customer reviews
"""

from ml.prediction.reply_engine import generate_artist_reply
import json

def test_review(customer_name, review_text):
    print("=" * 80)
    print(f"Customer: {customer_name}")
    print(f"Review: {review_text}")
    print("-" * 80)
    
    result = generate_artist_reply(review_text, customer_name)
    
    print(f"\n📊 ML Analysis:")
    print(f"   Sentiment: {result['sentiment'].upper()} (Confidence: {result['sentiment_confidence']:.2%})")
    print(f"   Topics: {', '.join(result['topic_labels'])} (Confidence: {result['topic_confidence']:.2%})")
    print(f"   Emoji: {result['emoji']}")
    
    print(f"\n💬 Generated Reply:")
    print(f"   {result['reply']}")
    print("=" * 80)
    print()

if __name__ == "__main__":
    print("\n" + "=" * 80)
    print(" " * 20 + "ML REPLY ENGINE - DEMONSTRATION")
    print("=" * 80 + "\n")

    # Test Case 1: Positive review about canvas art
    test_review(
        "karthik",
        "Dear karthik, Thank you so much for your amazing review! We are truly honored that you took the time to share your experience with ashmija in color. Your words inspire us to continue creating beautiful, meaningful art that transforms spaces and touches hearts. We look forward to bringing more color and joy to your world! With gratitude, The ashmija in color Team"
    )

    # Test Case 2: Positive review about mural design
    test_review(
        "priya",
        "The mural design for my living room is absolutely stunning! The colors are vibrant and the design exceeded my expectations. Highly recommended!"
    )

    # Test Case 3: Mixed feedback about delivery
    test_review(
        "rahul",
        "The artwork quality is good but the delivery was delayed by a week. Please improve your shipping process."
    )

    # Test Case 4: Negative feedback about communication
    test_review(
        "anita",
        "I tried contacting the studio multiple times but didn't get a response. Very disappointed with the communication."
    )

    # Test Case 5: Positive review about pricing
    test_review(
        "vijay",
        "Great value for money! The custom canvas painting was worth every penny. Will definitely order again!"
    )

    print("\n✅ ML Model demonstration complete!")
    print("The model successfully analyzes customer reviews and generates personalized replies.")