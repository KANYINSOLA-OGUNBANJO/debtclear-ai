import { useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { generatePDF } from './pdfGenerator'

interface Debt {
  name: string
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
    { name: '', balance: 0, apr: 0, minPayment: 0 }
  ])
  const [monthlyBudget, setMonthlyBudget] = useState(0)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any>(null)

  const addDebt = () => {
    setDebts([...debts, { name: '', balance: 0, apr: 0, minPayment: 0 }])
  }

  const updateDebt = (index: number, field: string, value: string | number) => {
    const newDebts = [...debts]
    newDebts[index] = { ...newDebts[index], [field]: value }
    setDebts(newDebts)
  }

  const calculateOptimization = async () => {
    const validDebts = debts.filter(d => d.name && d.balance > 0 && d.apr > 0)
    
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
      const response = await fetch('http://127.0.0.1:8000/optimize', {
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
        setTimeout(() => {
          document.getElementById('results')?.scrollIntoView({ behavior: 'smooth' })
        }, 100)
      } else {
        alert('Error: ' + data.error)
      }
    } catch (error) {
      alert('Failed to connect to AI backend. Make sure the backend is running!')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // Prepare chart data
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            DebtClear AI
          </h1>
          <p className="text-xl text-gray-600">
            The UK's first debt optimizer with explainable AI
          </p>
          <p className="text-sm text-gray-500 mt-2">
            See exactly WHY you should pay each debt first
          </p>
        </div>

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
                    Debt Name (e.g., Credit Card, Loan)
                  </label>
                  <input
                    type="text"
                    value={debt.name}
                    onChange={(e) => updateDebt(index, 'name', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Barclaycard"
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
                    placeholder="29.9"
                  />
                </div>

                <div>
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

          <button
            onClick={calculateOptimization}
            disabled={loading}
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '🧠 AI is Thinking...' : 'Calculate My Optimal Strategy 🚀'}
          </button>
        </div>

        {/* Results Section */}
        {results && (
          <div id="results" className="max-w-4xl mx-auto mt-8 space-y-8">
            
            {/* Strategy Comparison Cards */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                ✨ Your Personalized Debt Freedom Plan
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

            {/* Timeline Chart */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                📈 Debt Payoff Timeline
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
                📊 Strategy Comparison
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
                🔍 Why This Order? (AI Explanation)
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

            {/* Call to Action */}
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border-2 border-green-200">
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  🎯 Ready to become debt-free in {results.strategies[results.recommended].months_to_freedom} months?
                </h3>
                <p className="text-gray-700 mb-4">
                  You'll save £{Math.abs(results.strategies.snowball.total_interest - results.strategies[results.recommended].total_interest).toFixed(2)} compared to paying smallest debts first!
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => generatePDF({
                      debts: debts.filter(d => d.name && d.balance > 0),
                      monthlyBudget,
                      results
                    })}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    📄 Download as PDF
                  </button>
                  <button className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                    📧 Email My Plan (Coming Soon!)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mt-12 text-gray-600">
          <p className="text-sm">
            Built by Kanyinsola Ogunbanjo | MSc FinTech
          </p>
          <p className="text-xs mt-1">
            Using Explainable AI to help people make smarter financial decisions
          </p>
        </div>
      </div>
    </div>
  )
}

export default App