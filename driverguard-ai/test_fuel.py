import joblib, pandas as pd 
m = joblib.load('fuel_model.pkl') 
test = pd.DataFrame([[60, 0.5, 2000, 30, 95, 85, 0, 0, 55, 1800, 28, 33.3, 2.0]], columns=['speed_kmh','acceleration_ms2','rpm','throttle_pct','maf_kg_h','coolant_temp_c','boost_psi','is_idle','speed_kmh_mean5s','rpm_mean5s','throttle_pct_mean5s','rpm_per_speed','speed_change_per_sec']) 
result = m.predict(test) 
print('Fuel prediction:', result) 
