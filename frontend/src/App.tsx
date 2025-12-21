import { useState } from 'react'

function App() {
  const [debts, setDebts] = useState([
    { name: '', balance: 0, apr: 0, minPayment: 0 }
  ])
  const [monthlyBudget, setMonthlyBudget] = useState(0)

  const addDebt = () => {
    setDebts([...debts, { name: '', balance: 0, apr: 0, minPayment: 0 }])
  }

  const updateDebt = (index: number, field: string, value: string | number) => {
    const newDebts = [...debts]
    newDebts[index] = { ...newDebts[index], [field]: value }
    setDebts(newDebts)
  }

  const calculateOptimization = () => {
    alert('We will add the AI calculation tomorrow!')
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
            className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-bold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg"
          >
            Calculate My Optimal Strategy 🚀
          </button>

          <div className="mt-8 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
            <p className="text-sm text-gray-700">
              <span className="font-semibold">💡 Coming soon:</span> Our AI will analyze your debts and show you exactly WHY you should pay each one in a specific order, using SHAP (Shapley values) - the same explainable AI used by major banks!
            </p>
          </div>
        </div>

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