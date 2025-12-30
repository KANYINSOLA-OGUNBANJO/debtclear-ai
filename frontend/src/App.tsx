import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { generatePDF } from './pdfGenerator'
import { sendEmail } from './emailSender'
import confetti from 'canvas-confetti'

interface Debt {
  name: string
  type: string
  balance: number
  apr: number
  minPayment: number
}

interface Strategy {
  months_to_freedom: number
  total_interest: number
  priority_order: number[]
  timeline: Array<{
    month: number
    remaining_balance: number
    interest_this_month: number
  }>
}

interface Explanation {
  debt_name: string
  rank: number
  explanation: string
  shap_values: Record<string, number>
}

function App() {
  const [debts, setDebts] = useState<Debt[]>([
    { name: '', type: 'credit-card', balance: 0, apr: 0, minPayment: 0 }
  ])
  const [monthlyBudget, setMonthlyBudget] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)
  const [showEmailDialog, setShowEmailDialog] = useState(false)
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [bonusAmount, setBonusAmount] = useState(0)
  const [bonusResult, setBonusResult] = useState<any>(null)
  const [calculatingBonus, setCalculatingBonus] = useState(false)

  const addDebt = () => {
    setDebts([...debts, { name: '', type: 'credit-card', balance: 0, apr: 0, minPayment: 0 }])
  }

  const getTypicalAPR = (type: string): number => {
    const aprRanges: Record<string, number> = {
      'credit-card': 24.9,
      'store-card': 29.9,
      'personal-loan': 9.9,
      'car-finance': 7.9,
      'payday-loan': 400,
      'overdraft': 39.9,
      'student-loan': 5.5,
      'buy-now-pay-later': 0,
      'other': 10
    }
    return aprRanges[type] || 10
  }

  const handleTypeChange = (index: number, type: string) => {
    const newDebts = [...debts]
    newDebts[index] = { 
      ...newDebts[index], 
      type: type,
      apr: getTypicalAPR(type)
    }
    setDebts(newDebts)
  }

  const updateDebt = (index: number, field: string, value: string | number) => {
    const newDebts = [...debts]
    newDebts[index] = { ...newDebts[index], [field]: value }
    setDebts(newDebts)
  }

  const calculateOptimization = async () => {
    const validDebts = debts.filter(d => d.balance > 0 && d.apr >= 0)
    
    if (validDebts.length === 0) {
      alert('Please enter at least one complete debt!')
      return
    }
    
    if (monthlyBudget <= 0) {
      alert('Please enter your monthly budget!')
      return
    }

    setLoading(true)
    
    try {
      const response = await fetch('https://debtclear-ai.onrender.com/optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          debts: validDebts,
          monthlyBudget: monthlyBudget
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setResults(data)
        setBonusResult(null)
        
        // Trigger confetti animation
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          })
          
          // Scroll to results
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Failed to connect to backend. Make sure the server is running!')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!userName.trim()) {
      alert('Please enter your name!')
      return
    }
    
    if (!userEmail.trim() || !userEmail.includes('@')) {
      alert('Please enter a valid email address!')
      return
    }
    
    setSendingEmail(true)
    
    try {
      const emailData = {
        userName: userName,
        userEmail: userEmail,
        months: results.strategies.hybrid.months_to_freedom,
        strategy: 'Hybrid (Recommended)',
        interest: results.strategies.hybrid.total_interest,
        savings: Math.abs(
          results.strategies.snowball.total_interest - 
          results.strategies.hybrid.total_interest
        ),
        explanation: results.explanations
          .map((exp: any) => `${exp.rank}. ${exp.debt_name}: ${exp.explanation}`)
          .join('\n\n')
      }
      
      const success = await sendEmail(emailData)
      
      if (success) {
        alert('Email sent successfully! Check your inbox.')
        setShowEmailDialog(false)
        setUserName('')
        setUserEmail('')
      } else {
        alert('Failed to send email. Please try again.')
      }
    } catch (error) {
      alert('Failed to send email. Please try again.')
      console.error(error)
    } finally {
      setSendingEmail(false)
    }
  }

  const prepareTimelineData = () => {
    if (!results) return []
    
    const maxMonths = Math.max(
      results.strategies.avalanche.timeline.length,
      results.strategies.snowball.timeline.length,
      results.strategies.hybrid.timeline.length
    )
    
    const chartData = []
    for (let i = 0; i < maxMonths; i++) {
      chartData.push({
        month: i + 1,
        avalanche: results.strategies.avalanche.timeline[i]?.remaining_balance || 0,
        snowball: results.strategies.snowball.timeline[i]?.remaining_balance || 0,
        hybrid: results.strategies.hybrid.timeline[i]?.remaining_balance || 0,
      })
    }
    
    return chartData
  }

  const prepareComparisonData = () => {
    if (!results) return []
    
    return [
      {
        name: 'Avalanche',
        months: results.strategies.avalanche.months_to_freedom,
        interest: results.strategies.avalanche.total_interest,
      },
      {
        name: 'Snowball',
        months: results.strategies.snowball.months_to_freedom,
        interest: results.strategies.snowball.total_interest,
      },
      {
        name: 'Hybrid',
        months: results.strategies.hybrid.months_to_freedom,
        interest: results.strategies.hybrid.total_interest,
      }
    ]
  }

  const calculateFreedomDate = (monthsFromNow: number): string => {
    const today = new Date()
    const freedomDate = new Date(today)
    freedomDate.setMonth(freedomDate.getMonth() + monthsFromNow)
    
    return freedomDate.toLocaleDateString('en-GB', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  const calculateBonusImpact = async () => {
    if (bonusAmount <= 0) {
      alert('Please enter a bonus amount!')
      return
    }
    
    setCalculatingBonus(true)
    
    try {
      const validDebts = debts.filter(d => d.balance > 0 && d.apr >= 0)
      
      const response = await fetch('https://debtclear-ai.onrender.com/calculate-bonus-impact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          debts: validDebts.map(d => ({
            name: d.name,
            balance: d.balance,
            apr: d.apr,
            minPayment: d.minPayment,
            type: d.type
          })),
          monthlyBudget: monthlyBudget,
          extraPayment: bonusAmount
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setBonusResult(data.result)
        
        // Trigger confetti for bonus calculation
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        })
      } else {
        alert('Error calculating bonus impact: ' + data.error)
      }
    } catch (error) {
      alert('Failed to calculate bonus impact!')
      console.error(error)
    } finally {
      setCalculatingBonus(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DebtClear AI
          </h1>
          <p className="text-xl text-gray-600 mb-4">
            Mathematical Debt Optimization with Transparent Results
          </p>
          
          {/* Trust Badges */}
          <div className="flex flex-wrap justify-center gap-4 mb-6">
            <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold border border-blue-200">
              MSc FinTech Built
            </span>
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-semibold border border-green-200">
              Bank-Grade Algorithms
            </span>
            <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-200">
              100% Free
            </span>
            <span className="px-4 py-2 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold border border-indigo-200">
              Privacy First
            </span>
          </div>
        </div>

        {/* How It Works Section */}
        <div className="max-w-4xl mx-auto mb-8 bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 text-center">
            How Our Calculations Work
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Proven Algorithms</h3>
                <p className="text-sm text-gray-600">Uses industry-standard Avalanche and Snowball methods, mathematically proven to minimize interest</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Explainable Technology</h3>
                <p className="text-sm text-gray-600">Powered by SHAP analysis (the same technology banks use) - you see exactly WHY each debt is prioritized</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Compound Interest Math</h3>
                <p className="text-sm text-gray-600">Calculations based on actual compound interest formulas - the same math your creditors use</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                ✓
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Personalized Results</h3>
                <p className="text-sm text-gray-600">Every calculation is tailored to your exact balances, interest rates, and monthly budget</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Input Form */}
        <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Enter Your Debts
          </h2>

          {debts.map((debt, index) => (
            <div key={index} className="mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-200">
              <h3 className="font-semibold text-gray-700 mb-4">
                Debt #{index + 1}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Debt Type
                  </label>
                  <select
                    value={debt.type}
                    onChange={(e) => handleTypeChange(index, e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="credit-card">Credit Card</option>
                    <option value="store-card">Store Card</option>
                    <option value="personal-loan">Personal Loan</option>
                    <option value="car-finance">Car Finance</option>
                    <option value="payday-loan">Payday Loan</option>
                    <option value="overdraft">Bank Overdraft</option>
                    <option value="student-loan">Student Loan</option>
                    <option value="buy-now-pay-later">Buy Now Pay Later</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Debt Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={debt.name}
                    onChange={(e) => updateDebt(index, 'name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Barclaycard, HSBC Loan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Balance (£)
                  </label>
                  <input
                    type="number"
                    value={debt.balance || ''}
                    onChange={(e) => updateDebt(index, 'balance', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="2400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Interest Rate (APR %)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={debt.apr || ''}
                    onChange={(e) => updateDebt(index, 'apr', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Auto-filled based on type"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Payment (£)
                  </label>
                  <input
                    type="number"
                    value={debt.minPayment || ''}
                    onChange={(e) => updateDebt(index, 'minPayment', parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="60"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addDebt}
            className="w-full mb-6 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            + Add Another Debt
          </button>

          <div className="mb-8 p-6 bg-blue-50 rounded-lg border-2 border-blue-200">
            <label className="block text-lg font-semibold text-gray-800 mb-3">
              How much can you pay toward debts each month? (£)
            </label>
            <input
              type="number"
              value={monthlyBudget || ''}
              onChange={(e) => setMonthlyBudget(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="500"
            />
            <p className="text-sm text-gray-600 mt-2">
              This is the total amount you can pay across ALL debts each month
            </p>
          </div>

          {/* Privacy & Disclaimer Notice */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-300">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Your Privacy Matters</h4>
                <p className="text-xs text-gray-600">We don't store your financial data. All calculations happen securely in real-time and nothing is saved to our servers.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">Important Note</h4>
                <p className="text-xs text-gray-600">This tool provides educational guidance based on mathematical optimization. Results are accurate based on the information you provide. Always verify with your creditors and consider consulting a financial advisor for personalized advice.</p>
              </div>
            </div>
          </div>

          <button
            onClick={calculateOptimization}
            disabled={loading}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing your debts...
              </span>
            ) : (
              'Calculate My Optimal Strategy'
            )}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div id="results" className="max-w-4xl mx-auto mt-8 space-y-8">
            
            {/* Strategy Comparison Cards */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Your Personalized Debt Freedom Plan
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(results.strategies).map(([name, strategy]: [string, any]) => (
                  <div
                    key={name}
                    className={`p-6 rounded-lg border-2 ${
                      name === results.recommended
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-bold text-lg capitalize">{name}</h3>
                      {name === results.recommended && (
                        <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                          RECOMMENDED
                        </span>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-2">
                      {strategy.months_to_freedom} months
                    </p>
                    <p className="text-sm text-gray-600">
                      £{strategy.total_interest.toFixed(2)} interest
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Debt Freedom Date + Bonus Calculator */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-3">
                  Your Debt Freedom Date
                </h2>
                <div className="inline-block p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl border-2 border-green-300">
                  <p className="text-sm text-gray-600 mb-2">You'll be completely debt-free by:</p>
                  <p className="text-4xl font-bold text-green-600 mb-2">
                    {calculateFreedomDate(results.strategies[results.recommended].months_to_freedom)}
                  </p>
                  <p className="text-lg text-gray-700">
                    That's <span className="font-bold text-blue-600">{results.strategies[results.recommended].months_to_freedom} months</span> from now
                  </p>
                </div>
              </div>
              
              <div className="border-t-2 border-gray-200 pt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                  Got a Bonus or Windfall?
                </h3>
                <p className="text-gray-600 text-center mb-6">
                  See how a one-time extra payment accelerates your debt freedom
                </p>
                
                <div className="max-w-md mx-auto">
                  <div className="flex gap-3 mb-6">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Extra Payment Amount (£)
                      </label>
                      <input
                        type="number"
                        value={bonusAmount || ''}
                        onChange={(e) => setBonusAmount(parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., 2000"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Tax refund, bonus, gift, inheritance, etc.
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={calculateBonusImpact}
                    disabled={calculatingBonus || bonusAmount <= 0}
                    className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {calculatingBonus ? (
                      <span className="flex items-center justify-center gap-3">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Calculating...
                      </span>
                    ) : (
                      'Calculate Impact'
                    )}
                  </button>
                </div>
                
                {bonusResult && (
                  <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border-2 border-green-300">
                    <h4 className="text-xl font-bold text-gray-900 mb-4 text-center">
                      Impact of £{bonusAmount.toLocaleString()} Extra Payment
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div className="text-center p-4 bg-white rounded-lg border-2 border-gray-200">
                        <p className="text-sm text-gray-600 mb-1">Original Plan</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {bonusResult.original.months} months
                        </p>
                        <p className="text-sm text-gray-600 mt-2">
                          £{bonusResult.original.interest.toFixed(2)} interest
                        </p>
                      </div>
                      
                      <div className="text-center p-4 bg-green-100 rounded-lg border-2 border-green-500">
                        <p className="text-sm text-green-800 mb-1">With Extra Payment</p>
                        <p className="text-2xl font-bold text-green-700">
                          {bonusResult.accelerated.months} months
                        </p>
                        <p className="text-sm text-green-800 mt-2">
                          £{bonusResult.accelerated.interest.toFixed(2)} interest
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-300">
                        <span className="text-sm font-medium text-gray-700">Time Saved:</span>
                        <span className="text-xl font-bold text-green-600">
                          {bonusResult.savings.months_saved} months
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-green-300">
                        <span className="text-sm font-medium text-gray-700">Interest Saved:</span>
                        <span className="text-xl font-bold text-green-600">
                          £{bonusResult.savings.interest_saved.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-6 text-center">
                      <p className="text-lg font-bold text-green-700">
                        New Freedom Date: {calculateFreedomDate(bonusResult.accelerated.months)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Budget Scenario Comparison */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                What If You Paid More?
              </h3>
              <p className="text-gray-600 mb-6">
                See how increasing your monthly payment accelerates your debt freedom
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {results.budget_scenarios?.map((scenario: any, index: number) => {
                  const isBase = index === 0
                  const timeSaved = isBase ? 0 : results.budget_scenarios[0].months - scenario.months
                  const interestSaved = isBase ? 0 : results.budget_scenarios[0].interest - scenario.interest
                  
                  return (
                    <div
                      key={index}
                      className={`p-6 rounded-lg border-2 ${
                        index === 1
                          ? 'border-green-500 bg-green-50 transform scale-105'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="text-center mb-4">
                        <p className="text-sm text-gray-600 mb-1">
                          {isBase ? 'Your Current Budget' : `Pay £${scenario.budget - results.budget_scenarios[0].budget} More`}
                        </p>
                        <p className="text-3xl font-bold text-gray-900">
                          £{scenario.budget}
                          <span className="text-sm text-gray-500">/month</span>
                        </p>
                      </div>
                      
                      <div className="space-y-3 border-t-2 border-gray-200 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Time to Freedom:</span>
                          <span className="font-bold text-blue-600">{scenario.months} months</span>
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Total Interest:</span>
                          <span className="font-bold text-red-600">£{scenario.interest.toFixed(2)}</span>
                        </div>
                        
                        {!isBase && (
                          <div className="mt-4 pt-4 border-t-2 border-green-200 bg-green-100 -mx-6 px-6 py-3 rounded-b-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-800">Time Saved:</span>
                              <span className="font-bold text-green-700">
                                {timeSaved} months
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-green-800">Interest Saved:</span>
                              <span className="font-bold text-green-700">
                                £{interestSaved.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {index === 1 && (
                        <div className="mt-4 text-center">
                          <span className="inline-block px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                            BEST VALUE
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <p className="text-sm text-gray-700">
                  <strong>Pro Tip:</strong> Even small increases make a big difference. Paying just £100 more per month could save you months of payments and hundreds in interest.
                </p>
              </div>
            </div>

            {/* Timeline Chart */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Debt Payoff Timeline
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={prepareTimelineData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="month" 
                    label={{ value: 'Months', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Remaining Balance (£)', angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip 
                    formatter={(value: number) => `£${value.toFixed(2)}`}
                    labelFormatter={(label) => `Month ${label}`}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avalanche" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Avalanche"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="snowball" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Snowball"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="hybrid" 
                    stroke="#10b981" 
                    strokeWidth={3}
                    name="Hybrid (Recommended)"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-sm text-gray-600 mt-4 text-center">
                Watch your debt decrease over time with each strategy
              </p>
            </div>

            {/* Comparison Chart */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Strategy Comparison
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Time to Freedom</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={prepareComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Months', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Bar dataKey="months" fill="#3b82f6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-700 mb-4">Total Interest Paid</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={prepareComparisonData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: 'Interest (£)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip formatter={(value: number) => `£${value.toFixed(2)}`} />
                      <Bar dataKey="interest" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* SHAP Explanations */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Why This Order? (Detailed Explanation)
              </h3>
              {results.explanations.map((exp: Explanation, idx: number) => (
                <div key={idx} className="mb-4 p-6 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-8 h-8 bg-blue-500 text-white rounded-full font-bold">
                      {exp.rank}
                    </span>
                    <h4 className="text-lg font-bold text-gray-900">{exp.debt_name}</h4>
                  </div>
                  <p className="text-gray-700">{exp.explanation}</p>
                </div>
              ))}
            </div>

            {/* Payment Schedule */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Your Monthly Payment Plan
              </h3>
              <p className="text-gray-600 mb-6">
                Follow this exact plan each month. We show the first 12 months below.
              </p>
              
              <div className="space-y-4">
                {results.strategies[results.recommended].payment_schedule?.slice(0, 12).map((month: any) => (
                  <div key={month.month} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-lg text-gray-900">
                        Month {month.month}
                      </h4>
                      <span className="text-sm font-semibold text-blue-600">
                        Total: £{month.total_paid}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      {month.payments.map((payment: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            {payment.paid_off && (
                              <span className="text-green-500 text-xl">✓</span>
                            )}
                            <div>
                              <p className="font-medium text-gray-900">
                                {payment.debt_name}
                              </p>
                              <p className="text-sm text-gray-600">
                                Remaining: £{payment.remaining_balance.toLocaleString()}
                                {payment.paid_off && <span className="text-green-600 font-bold ml-2">PAID OFF</span>}
                              </p>
                            </div>
                          </div>
                          <span className="font-bold text-blue-600">
                            £{payment.payment_amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {results.strategies[results.recommended].payment_schedule?.length > 12 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  Showing first 12 months of {results.strategies[results.recommended].months_to_freedom} month plan
                </p>
              )}
            </div>

            {/* Call to Action */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Ready to become debt-free in {results.strategies[results.recommended].months_to_freedom} months?
                </h3>
                <p className="text-gray-700 mb-4">
                  You'll save £{Math.abs(results.strategies.snowball.total_interest - results.strategies[results.recommended].total_interest).toFixed(2)} compared to paying smallest debts first
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => generatePDF({
                      debts: debts.filter(d => d.balance > 0),
                      monthlyBudget,
                      results
                    })}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download as PDF
                  </button>
                  <button 
                    onClick={() => setShowEmailDialog(true)}
                    className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Email My Plan
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Email Dialog */}
        {showEmailDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Email Your Plan
              </h3>
              <p className="text-gray-600 mb-6">
                We'll send your personalized debt freedom plan to your email
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
                <button
                  onClick={() => {
                    setShowEmailDialog(false)
                    setUserName('')
                    setUserEmail('')
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-12 py-8 border-t border-gray-300">
          <p className="text-sm text-gray-700 font-semibold mb-1">
            Built by Kanyinsola Ogunbanjo, MSc FinTech
          </p>
          <p className="text-xs text-gray-500">
            Powered by Explainable Technology & Proven Debt Optimization Algorithms
          </p>
        </div>
      </div>
    </div>
  )
}

export default App