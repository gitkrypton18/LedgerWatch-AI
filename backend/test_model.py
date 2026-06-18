import sys
import pandas as pd
import joblib

sys.path.append('f:/ML PROJECT/LedgerWatch-AI/LedgerWatch-AI/backend')

from src.features import engineer_all_features

model_data = joblib.load('f:/ML PROJECT/LedgerWatch-AI/LedgerWatch-AI/backend/saved_models/isolation_forest_v1.0.0.joblib')
model = model_data['model']
expected_features = model_data['feature_names']

print("Expected Features:", expected_features)

df = pd.DataFrame([{
    "step": 1,
    "type": "PAYMENT",
    "amount": 9839.64,
    "nameOrig": "C1231006815",
    "oldbalanceOrg": 170136.0,
    "newbalanceOrig": 160296.36,
    "nameDest": "M1979787155",
    "oldbalanceDest": 0.0,
    "newbalanceDest": 0.0,
    "isFraud": 0,
    "isFlaggedFraud": 0
}])

df.to_csv("test.csv", index=False)
from pathlib import Path
features = engineer_all_features(input_path=Path("test.csv"), save=False)

# Align
for col in expected_features:
    if col not in features.columns:
        features[col] = 0.0

X = features[expected_features]
print("\nFeature Values:")
for col in expected_features:
    print(f"{col}: {X[col].iloc[0]}")

score = model.score_samples(X)[0]
pred = model.predict(X)[0]

print(f"\nScore: {score}")
print(f"Prediction: {pred}")
