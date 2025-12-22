import shap
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from typing import List, Dict

class SHAPExplainer:
    """
    Uses SHAP (Shapley values) to explain WHY
    the AI recommends a specific debt payoff order
    """
    
    def __init__(self):
        self.feature_names = [
            'Interest Rate Impact',
            'Balance Size Impact', 
            'Quick Win Potential',
            'Monthly Payment Burden'
        ]
    
    def explain_recommendation(self, debts: List[Dict], priority_order: List[int]) -> Dict:
        """
        Generate SHAP explanations for why debts are prioritized in this order
        """
        
        # Convert debts into features for ML model
        features = self._extract_features(debts)
        
        # Create target: priority rank (1st = highest value)
        targets = np.zeros(len(debts))
        for rank, debt_index in enumerate(priority_order):
            targets[debt_index] = 1.0 / (rank + 1)  # 1st = 1.0, 2nd = 0.5, etc.
        
        # Train a simple model to learn the prioritization
        model = RandomForestRegressor(n_estimators=100, random_state=42, max_depth=3)
        model.fit(features, targets)
        
        # Calculate SHAP values
        explainer = shap.TreeExplainer(model)
        shap_values = explainer.shap_values(features)
        
        # Generate human-readable explanations
        explanations = []
        for i, debt_idx in enumerate(priority_order):
            explanation = self._generate_explanation(
                debts[debt_idx],
                shap_values[debt_idx],
                i + 1  # rank (1st, 2nd, 3rd...)
            )
            explanations.append(explanation)
        
        return {
            'explanations': explanations,
            'feature_importance': self._calculate_overall_importance(shap_values)
        }
    
    def _extract_features(self, debts: List[Dict]) -> np.ndarray:
        """
        Convert debt information into numbers the ML model can understand
        """
        features = []
        
        for debt in debts:
            features.append([
                debt['apr'],  # Interest rate
                np.log(debt['balance'] + 1),  # Log of balance
                10000 / max(debt['balance'], 100),  # Quick win score
                debt['minPayment'] / debt['balance'] * 100  # Payment burden %
            ])
        
        return np.array(features)
    
    def _generate_explanation(self, debt: Dict, shap_vals: np.ndarray, rank: int) -> Dict:
        """
        Turn SHAP numbers into plain English
        """
        
        # Find which features had the biggest impact
        feature_impacts = list(zip(self.feature_names, shap_vals))
        feature_impacts.sort(key=lambda x: abs(x[1]), reverse=True)
        
        # Generate explanation text
        explanation_parts = []
        
        for feature_name, impact in feature_impacts[:2]:  # Top 2 factors
            impact_pct = int(abs(impact) * 100)
            
            if 'Interest Rate' in feature_name and impact > 0.1:
                explanation_parts.append(
                    f"The high interest rate ({debt['apr']:.1f}% APR) is a major factor ({impact_pct}% weight). "
                    f"Every month you carry this debt costs £{self._monthly_interest(debt):.0f} in interest."
                )
            
            elif 'Balance Size' in feature_name and impact < 0:
                explanation_parts.append(
                    f"While the balance is large (£{debt['balance']:,.0f}), "
                    f"we're balancing total interest savings with psychological wins."
                )
            
            elif 'Quick Win' in feature_name and impact > 0.1:
                explanation_parts.append(
                    f"This debt can be paid off quickly for a motivational boost ({impact_pct}% factor)."
                )
        
        return {
            'debt_name': debt['name'],
            'rank': rank,
            'explanation': ' '.join(explanation_parts) if explanation_parts else 
                          f"This debt is ranked #{rank} in our AI's recommendation.",
            'shap_values': {
                name: float(val) for name, val in zip(self.feature_names, shap_vals)
            }
        }
    
    def _monthly_interest(self, debt: Dict) -> float:
        """Calculate monthly interest cost"""
        return debt['balance'] * (debt['apr'] / 100 / 12)
    
    def _calculate_overall_importance(self, shap_values: np.ndarray) -> Dict:
        """Calculate which features matter most overall"""
        avg_importance = np.abs(shap_values).mean(axis=0)
        
        return {
            name: float(importance) 
            for name, importance in zip(self.feature_names, avg_importance)
        }