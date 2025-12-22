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
        Simulate month-by-month payoff and calculate total interest
        """
        
        # Make copies of balances
        balances = [debt['balance'] for debt in debts]
        
        months = 0
        total_interest = 0.0
        monthly_timeline = []
        
        # Keep going until all debts are paid
        while any(balance > 0 for balance in balances):
            months += 1
            
            # Safety check - don't run forever
            if months > 360:  # 30 years max
                break
            
            # Calculate how much we need for minimum payments
            min_payments_total = sum(
                debts[i]['minPayment'] 
                for i in range(len(debts)) 
                if balances[i] > 0
            )
            
            # How much extra can we pay?
            extra_payment = max(0, budget - min_payments_total)
            
            # Pay minimums on everything
            for i in range(len(debts)):
                if balances[i] > 0:
                    payment = min(debts[i]['minPayment'], balances[i])
                    balances[i] -= payment
                    balances[i] = max(0, balances[i])
            
            # Put extra payment on priority debt
            for priority_index in order:
                if balances[priority_index] > 0 and extra_payment > 0:
                    payment = min(extra_payment, balances[priority_index])
                    balances[priority_index] -= payment
                    extra_payment -= payment
                    break
            
            # Calculate interest for this month
            month_interest = 0
            for i in range(len(debts)):
                if balances[i] > 0:
                    monthly_rate = debts[i]['apr'] / 100 / 12
                    month_interest += balances[i] * monthly_rate
            
            total_interest += month_interest
            
            # Save this month's snapshot
            monthly_timeline.append({
                'month': months,
                'remaining_balance': round(sum(balances), 2),
                'interest_this_month': round(month_interest, 2)
            })
        
        return {
            'months_to_freedom': months,
            'total_interest': round(total_interest, 2),
            'priority_order': order,
            'timeline': monthly_timeline[:12]  # First 12 months only
        }