"""
Chatbot services module.

Provides modular, production-grade services for the AI chatbot:
- llm_service: Centralized LLM wrapper with per-provider circuit breaker
- intent_service: Intent classification (rule-based with spell correction)
- booking_service: Deterministic slot-filling appointment engine
- rag_service: Hybrid RAG retrieval with source attribution
- cache_service: Semantic caching for FAQ responses
- system_validation: Environment & RAG index validation
"""
