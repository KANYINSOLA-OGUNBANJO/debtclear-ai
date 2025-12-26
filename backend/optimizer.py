import numpy as np
from typing import List, Dict, Tuple

class DebtOptimizer:
    """
    Calculates three debt payoff strategies:
    1. Avalanche (highest interest first)
    2. Snowball (smallest balance first)  
    3. Hybrid (AI-recommended balance)
    """
    
    def optimize(self, debts: List[Dict], monthly_budget: float) -> Dict:
        """
        Main function that calculates all strategies
        """
        
        # Calculate the three strategies
        avalanche = self._avalanche_method(debts, monthly_budget)
        snowball = self._snowball_method(debts, monthly_budget)
        hybrid = self._hybrid_method(debts, monthly_budget)
        
        return {
            'strategies': {
                'avalanche': avalanche,
                'snowball': snowball,
                'hybrid': hybrid
            },
            'recommended': 'hybrid'
        }
    
    def _avalanche_method(self, debts: List[Dict], budget: float) -> Dict:
        """
        Pay debts with highest interest rate first
        """
        # Sort by APR (highest first)
        sorted_indices = sorted(
            range(len(debts)),
            key=lambda i: debts[i]['apr'],
            reverse=True
        )
        
        return self._calculate_payoff(debts, sorted_indices, budget)
    
    def _snowball_method(self, debts: List[Dict], budget: float) -> Dict:
        """
        Pay debts with smallest balance first
        """
        # Sort by balance (smallest first)
        sorted_indices = sorted(
            range(len(debts)),
            key=lambda i: debts[i]['balance']
        )
        
        return self._calculate_payoff(debts, sorted_indices, budget)
    
    def _hybrid_method(self, debts: List[Dict], budget: float) -> Dict:
        """
        AI-recommended: balance between interest savings and quick wins
        """
        # Score each debt based on multiple factors
        scores = []
        for debt in debts:
            score = (
                debt['apr'] * 0.5 +  # Interest rate is most important
                (5000 / max(debt['balance'], 100)) * 0.3 +  # Bonus for small balances
                debt['minPayment'] * 0.2  # Consider payment burden
            )
            scores.append(score)
        
        # Sort by score (highest first)
        sorted_indices = sorted(
            range(len(scores)),
            key=lambda i: scores[i],
            reverse=True
        )
        
        return self._calculate_payoff(debts, sorted_indices, budget)
    
    def _calculate_payoff(self, debts: List[Dict], order: List[int], budget: float) -> Dict:
        """
        Simulate month-by-month payoff with detailed payment schedule
        """
        
        # Make copies of balances
        balances = [debt['balance'] for debt in debts]
        
        months = 0
        total_interest = 0.0
        monthly_timeline = []
        payment_schedule = []  # Detailed monthly payments
        
        # Keep going until all debts are paid
        while any(balance > 0 for balance in balances):
            months += 1
            
            # Safety check - don't run forever
            if months > 360:  # 30 years max
                break
            
            month_payments = []  # Track payments for this month
            month_total_paid = 0
            
            # Calculate how much we need for minimum payments
            min_payments_total = sum(
                debts[i]['minPayment'] 
                for i in range(len(debts)) 
                if balances[i] > 0
            )
            
            # How much extra can we pay?
            extra_payment = max(0, budget - min_payments_total)
            
            # Pay minimums on everything first
            for i in range(len(debts)):
                if balances[i] > 0:
                    payment = min(debts[i]['minPayment'], balances[i])
                    balances[i] -= payment
                    month_total_paid += payment
                    
                    # Record this payment
                    debt_name = debts[i].get('name', '') or debts[i].get('type', 'Unknown').replace('-', ' ').title()
                    
                    month_payments.append({
                        'debt_index': i,
                        'debt_name': debt_name,
                        'payment_amount': round(payment, 2),
                        'remaining_balance': round(max(0, balances[i]), 2),
                        'paid_off': balances[i] <= 0.01
                    })
                    
                    balances[i] = max(0, balances[i])
            
            # Put extra payment on priority debt
            for priority_index in order:
                if balances[priority_index] > 0 and extra_payment > 0:
                    payment = min(extra_payment, balances[priority_index])
                    balances[priority_index] -= payment
                    month_total_paid += payment
                    extra_payment -= payment
                    
                    # Update the payment record for this debt
                    for p in month_payments:
                        if p['debt_index'] == priority_index:
                            p['payment_amount'] += round(payment, 2)
                            p['remaining_balance'] = round(max(0, balances[priority_index]), 2)
                            p['paid_off'] = balances[priority_index] <= 0.01
                    
                    break
            
            # Calculate interest for this month
            month_interest = 0
            for i in range(len(debts)):
                if balances[i] > 0:
                    monthly_rate = debts[i]['apr'] / 100 / 12
                    month_interest += balances[i] * monthly_rate
            
            total_interest += month_interest
            
            # Save payment schedule for this month
            payment_schedule.append({
                'month': months,
                'payments': month_payments,
                'total_paid': round(month_total_paid, 2)
            })
            
            # Save this month's snapshot (for timeline chart)
            if months <= 12:
                monthly_timeline.append({
                    'month': months,
                    'remaining_balance': round(sum(balances), 2),
                    'interest_this_month': round(month_interest, 2)
                })
        
        return {
            'months_to_freedom': months,
            'total_interest': round(total_interest, 2),
            'priority_order': order,
            'timeline': monthly_timeline,
            'payment_schedule': payment_schedule[:24]  # First 24 months
        }


# NEW FUNCTION: Budget Scenario Comparison
def calculate_budget_scenarios(debts: List[Dict], base_budget: float) -> List[Dict]:
    """
    Calculate results for different budget amounts to show impact of paying more
    """
    optimizer = DebtOptimizer()
    scenarios = []
    
    # Calculate for base budget and two higher amounts
    budgets = [base_budget, base_budget + 100, base_budget + 200]
    
    for budget in budgets:
        result = optimizer.optimize(debts, budget)
        scenarios.append({
            'budget': budget,
            'months': result['strategies']['hybrid']['months_to_freedom'],
            'interest': result['strategies']['hybrid']['total_interest']
        })
def calculate_with_extra_payment(debts: List[Dict], base_budget: float, extra_payment: float) -> Dict:
    """
    Calculate impact of a one-time extra payment (bonus, tax refund, etc.)
    Returns both original plan and accelerated plan
    """
    optimizer = DebtOptimizer()
    
    # Original plan
    original = optimizer.optimize(debts, base_budget)
    
    # Make a copy of debts and apply extra payment to highest priority debt
    debts_copy = [debt.copy() for debt in debts]
    hybrid_order = original['strategies']['hybrid']['priority_order']
    
    # Apply extra payment to the first priority debt
    if hybrid_order and extra_payment > 0:
        priority_debt_index = hybrid_order[0]
        debts_copy[priority_debt_index]['balance'] = max(
            0, 
            debts_copy[priority_debt_index]['balance'] - extra_payment
        )
    
    # Calculate new plan with reduced balance
    accelerated = optimizer.optimize(debts_copy, base_budget)
    
    return {
        'original': {
            'months': original['strategies']['hybrid']['months_to_freedom'],
            'interest': original['strategies']['hybrid']['total_interest']
        },
        'accelerated': {
            'months': accelerated['strategies']['hybrid']['months_to_freedom'],
            'interest': accelerated['strategies']['hybrid']['total_interest']
        },
        'savings': {
            'months_saved': original['strategies']['hybrid']['months_to_freedom'] - 
                          accelerated['strategies']['hybrid']['months_to_freedom'],
            'interest_saved': original['strategies']['hybrid']['total_interest'] - 
                            accelerated['strategies']['hybrid']['total_interest']
        }
    }    
    return scenarios