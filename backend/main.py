from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from optimizer import DebtOptimizer, calculate_budget_scenarios, calculate_with_extra_payment
from explainer import SHAPExplainer

# Create the FastAPI app
app = FastAPI(title="DebtClear AI API")

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://debtclear-app.vercel.app",
        "https://*.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize our AI engines
optimizer = DebtOptimizer()
explainer = SHAPExplainer()

# Define data models
class Debt(BaseModel):
    name: str
    balance: float
    apr: float
    minPayment: float

class OptimizationRequest(BaseModel):
    debts: List[Debt]
    monthlyBudget: float

# Endpoints
@app.get("/")
def read_root():
    return {"message": "DebtClear AI Backend is running! 🚀"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "ai": "ready"}

@app.post("/optimize")
def optimize_debts(request: OptimizationRequest):
    """
    Calculate optimal debt payoff strategies with SHAP explanations and budget scenarios
    """
    
    try:
        # Convert Pydantic models to dictionaries
        debts_list = [debt.dict() for debt in request.debts]
        
        # Run the optimizer
        optimization_result = optimizer.optimize(debts_list, request.monthlyBudget)
        
        # Get SHAP explanations for the hybrid (recommended) strategy
        hybrid_order = optimization_result['strategies']['hybrid']['priority_order']
        shap_explanation = explainer.explain_recommendation(debts_list, hybrid_order)
        
        # Calculate budget scenarios
        budget_scenarios = calculate_budget_scenarios(debts_list, request.monthlyBudget)
        
        # Combine results
        return {
            'success': True,
            'strategies': optimization_result['strategies'],
            'recommended': optimization_result['recommended'],
            'explanations': shap_explanation['explanations'],
            'feature_importance': shap_explanation['feature_importance'],
            'budget_scenarios': budget_scenarios
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

@app.post("/calculate-bonus-impact")
def calculate_bonus_impact(request: dict):
    """
    Calculate impact of a one-time extra payment (bonus, tax refund, etc.)
    """
    try:
        debts_list = request['debts']
        monthly_budget = request['monthlyBudget']
        extra_payment = request['extraPayment']
        
        result = calculate_with_extra_payment(debts_list, monthly_budget, extra_payment)
        
        return {
            'success': True,
            'result': result
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }