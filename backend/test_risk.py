import joblib
from src.risk_engine import RiskEngine

engine = RiskEngine.load('f:/ML PROJECT/LedgerWatch-AI/LedgerWatch-AI/backend/saved_models/risk_engine_v1.0.0.joblib')

print("Percentiles:")
print(engine._percentiles)

scores = [0.4931594508576132]
risk = engine.transform(scores)
print("Risk:", risk)

