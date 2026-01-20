import { useState, useEffect } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { generatePDF } from './pdfGenerator'
import { sendEmail } from './emailSender'
import confetti from 'canvas-confetti'
import { TrendingDown, Snowflake, Zap, HelpCircle, X, Info, Sparkles, ArrowRight, CheckCircle, Terminal, Code, Cpu, Activity } from 'lucide-react'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { useRef } from 'react'

interface Debt {
  name: string
  type: string
  balance: number
  apr: number
  minPayment: number
}

interface Explanation {
  debt_name: string
  rank: number
  explanation: string
  shap_values: Record<string, number>
}

interface StrategyInfo {
  name: string
  icon: any
  color: string
  short: string
  description: string
  example: string
  pros: string[]
  cons: string[]
  bestFor: string
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
  const [showStrategyModal, setShowStrategyModal] = useState(false)
  const [activeStrategyTab, setActiveStrategyTab] = useState<'avalanche' | 'snowball' | 'hybrid'>('avalanche')
  const [currentStrategyIndex, setCurrentStrategyIndex] = useState(0)

  const { scrollYProgress } = useScroll()
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])

  useEffect(() => {
    const particlesContainer = document.querySelector('.particles')
    if (!particlesContainer) return

    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div')
      particle.className = 'particle'
      particle.style.left = `${Math.random() * 100}%`
      particle.style.animationDelay = `${Math.random() * 20}s`
      particle.style.animationDuration = `${15 + Math.random() * 10}s`
      particlesContainer.appendChild(particle)
    }
  }, [])

  const strategyInfo: Record<string, StrategyInfo> = {
    avalanche: {
      name: 'Avalanche Method',
      icon: TrendingDown,
      color: '#ff006e',
      short: 'Pay highest interest rate first',
      description: 'Focus on debts with the highest interest rates first while making minimum payments on others. This mathematically optimal approach saves you the most money in interest charges over time.',
      example: 'Credit Card (24% APR) → Personal Loan (12%) → Car Loan (5%)',
      pros: ['Saves the most money in interest', 'Fastest payoff mathematically', 'Most efficient use of money', 'Optimal for high-interest debt'],
      cons: ['May not see quick wins early on', 'Can feel slow if high-rate debt has large balance', 'Requires discipline'],
      bestFor: 'People motivated by numbers and maximizing savings. Ideal if you have high-interest credit card debt.'
    },
    snowball: {
      name: 'Snowball Method',
      icon: Snowflake,
      color: '#b388ff',
      short: 'Pay smallest balance first',
      description: 'Attack your smallest debt first regardless of interest rate. Once eliminated, roll that payment into the next smallest. Quick psychological wins keep you motivated.',
      example: 'Store Card (£500) → Credit Card (£3,000) → Car Loan (£8,000)',
      pros: ['Quick psychological wins', 'Builds confidence and momentum', 'See debts disappear faster', 'Higher success rate due to motivation'],
      cons: ['May pay more in total interest', 'Not the most mathematically efficient', 'Takes longer overall'],
      bestFor: 'People who need motivation and quick wins. Best if you struggle with commitment or have multiple small debts.'
    },
    hybrid: {
      name: 'Hybrid Method',
      icon: Zap,
      color: '#00ff88',
      short: 'Best of both approaches',
      description: 'Start with snowball to knock out 1-2 small debts for quick wins, then switch to avalanche to tackle high-interest debt. Balances psychology and efficiency.',
      example: 'Small debt (quick win!) → High APR debts → Remaining balances',
      pros: ['Early wins keep you motivated', 'Still saves significant interest', 'Flexible approach', 'Best of both strategies', 'Recommended by experts'],
      cons: ['Slightly more complex to plan', 'Requires thoughtful decisions'],
      bestFor: 'Most people! Combines efficiency of avalanche with motivation of snowball. Ideal for realistic debt payoff.'
    }
  }

  const AnimatedSection = ({ children, delay = 0 }: { children: React.ReactNode, delay?: number }) => {
    const ref = useRef(null)
    const isInView = useInView(ref, { once: true, margin: "-100px" })

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 50 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
        transition={{ duration: 0.6, delay, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    )
  }

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
        
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#00f0ff', '#00ff88', '#b388ff']
          })
          
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
        
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#00f0ff', '#00ff88', '#b388ff']
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

  const StrategyModal = () => {
    if (!showStrategyModal) return null

    const current = strategyInfo[activeStrategyTab]
    const Icon = current.icon

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto modal-backdrop"
        onClick={() => setShowStrategyModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="glass-card rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto my-8 border border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-[#1a1a1a]/95 backdrop-blur-xl border-b border-white/10 p-6 flex items-center justify-between z-10 rounded-t-2xl">
            <div>
              <h2 className="text-3xl font-bold text-white tech-heading flex items-center gap-3">
                <Terminal className="w-8 h-8 text-[#00f0ff]" />
                Debt Payoff Strategies
              </h2>
              <p className="text-gray-400 mt-1">Understanding your algorithmic options</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowStrategyModal(false)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/10"
            >
              <X className="w-6 h-6 text-gray-400" />
            </motion.button>
          </div>

          <div className="grid grid-cols-3 gap-4 p-6 bg-[#111111]/50">
            {(['avalanche', 'snowball', 'hybrid'] as const).map((key) => {
              const info = strategyInfo[key]
              const TabIcon = info.icon
              const isActive = activeStrategyTab === key
              
              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveStrategyTab(key)}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'bg-white/5 glow-border-cyan'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/5'
                  }`}
                  style={isActive ? { borderColor: info.color, boxShadow: `0 0 20px ${info.color}40` } : {}}
                >
                  <motion.div
                    animate={{ rotate: isActive ? 360 : 0 }}
                    transition={{ duration: 0.5 }}
                    className="w-12 h-12 rounded-lg flex items-center justify-center mb-3 mx-auto"
                    style={{ 
                      background: `linear-gradient(135deg, ${info.color}20, ${info.color}10)`,
                      border: `1px solid ${info.color}40`
                    }}
                  >
                    <TabIcon className="w-6 h-6" style={{ color: info.color }} />
                  </motion.div>
                  <h3 className="font-bold text-sm text-white">{info.name}</h3>
                </motion.button>
              )
            })}
          </div>

          <div className="p-8">
            <motion.div
              key={activeStrategyTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div 
                className="border-l-4 p-6 rounded-r-xl mb-6 relative overflow-hidden"
                style={{ 
                  backgroundColor: `${current.color}10`,
                  borderColor: current.color
                }}
              >
                <div className="flex items-start gap-4 relative z-10">
                  <div 
                    className="p-3 rounded-lg flex-shrink-0"
                    style={{ 
                      background: `linear-gradient(135deg, ${current.color}30, ${current.color}20)`,
                      boxShadow: `0 0 20px ${current.color}40`
                    }}
                  >
                    <Icon className="w-8 h-8" style={{ color: current.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-2 mono">{current.short}</h3>
                    <p className="text-gray-300 leading-relaxed">{current.description}</p>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-sm font-semibold text-gray-400 mb-1">EXAMPLE ORDER:</p>
                      <p className="text-sm text-gray-300 mono">{current.example}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl p-6"
                >
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#00ff88]" /> Advantages
                  </h4>
                  <ul className="space-y-2">
                    {current.pros.map((pro, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-2 text-gray-300 text-sm"
                      >
                        <span className="text-[#00ff88] font-bold">▹</span>
                        <span>{pro}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>

                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className="bg-[#ff006e]/5 border border-[#ff006e]/20 rounded-xl p-6"
                >
                  <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Info className="w-5 h-5 text-[#ff006e]" /> Trade-offs
                  </h4>
                  <ul className="space-y-2">
                    {current.cons.map((con, index) => (
                      <motion.li
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex gap-2 text-gray-300 text-sm"
                      >
                        <span className="text-[#ff006e] font-bold">▹</span>
                        <span>{con}</span>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              </div>

              <div 
                className="border rounded-xl p-6"
                style={{ 
                  backgroundColor: `${current.color}10`,
                  borderColor: `${current.color}40`
                }}
              >
                <h4 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Sparkles className="w-5 h-5" style={{ color: current.color }} /> Best For:
                </h4>
                <p className="text-gray-300 leading-relaxed">{current.bestFor}</p>
              </div>
            </motion.div>
          </div>

          <div className="border-t border-white/10 p-6 bg-[#111111]/50">
            <p className="text-sm text-gray-400 text-center mb-4">
              <Code className="w-4 h-4 inline mr-2" />
              Our AI uses the <span className="text-[#00ff88] font-mono">Hybrid</span> method for optimal results
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowStrategyModal(false)}
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%)',
                color: '#000',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.7)',
                border: '2px solid #00f0ff',
                fontWeight: '900'
              }}
              className="w-full px-6 py-3 rounded-xl font-bold"
            >
              INITIALIZE CALCULATION
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  const StrategyCards = () => {
    const strategies = ['avalanche', 'snowball', 'hybrid'] as const

    const nextStrategy = () => {
      setCurrentStrategyIndex((prev) => (prev + 1) % 3)
    }

    const prevStrategy = () => {
      setCurrentStrategyIndex((prev) => (prev - 1 + 3) % 3)
    }

    return (
      <AnimatedSection>
        <div className="max-w-6xl mx-auto mb-12 glass-card rounded-2xl p-8 relative overflow-hidden border border-white/10">
          <div className="text-center mb-10 relative z-10">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.6 }}
              className="inline-flex items-center gap-2 bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-[#00f0ff] px-6 py-3 rounded-full mb-6 backdrop-blur-sm"
            >
              <Cpu className="w-5 h-5" />
              <span className="text-sm font-bold mono">ALGORITHM COMPARISON</span>
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-4xl md:text-5xl font-extrabold text-white mb-4 leading-tight tech-heading"
            >
              We Analyze <span className="neon-text-cyan">3 Proven</span> Debt Strategies
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-gray-400 text-lg max-w-2xl mx-auto"
            >
              Advanced AI processes your debt portfolio using multiple optimization algorithms
            </motion.p>
          </div>

          <div className="hidden md:grid md:grid-cols-3 gap-6 mb-8 relative z-10">
            {strategies.map((key, index) => {
              const info = strategyInfo[key]
              const Icon = info.icon
              
              return (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.15, type: "spring" }}
                  whileHover={{ y: -10, scale: 1.02 }}
                  className="glass-card-hover rounded-xl p-6 border border-white/10 relative overflow-hidden group cursor-pointer"
                >
                  <div 
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ 
                      background: `radial-gradient(circle at top right, ${info.color}15, transparent 70%)`
                    }}
                  />
                  
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-16 h-16 rounded-lg flex items-center justify-center mb-4 relative z-10"
                    style={{ 
                      background: `linear-gradient(135deg, ${info.color}30, ${info.color}20)`,
                      border: `1px solid ${info.color}40`,
                      boxShadow: `0 0 20px ${info.color}30`
                    }}
                  >
                    <Icon className="w-9 h-9" style={{ color: info.color }} />
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2 tech-heading">{info.name}</h3>
                  <p className="text-sm text-gray-400 font-semibold mb-3 mono">{info.short}</p>
                  <p className="text-sm text-gray-300 leading-relaxed mb-4">{info.description}</p>
                  
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-xs font-bold text-gray-400 mb-1 mono">EXAMPLE:</p>
                    <p className="text-xs text-gray-400 mono">{info.example}</p>
                  </div>

                  <motion.div
                    className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                    whileHover={{ x: 5 }}
                  >
                    <ArrowRight className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </motion.div>
              )
            })}
          </div>

          <div className="md:hidden relative mb-8">
            <div className="overflow-hidden">
              <motion.div
                animate={{ x: `-${currentStrategyIndex * 100}%` }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex"
              >
                {strategies.map((key) => {
                  const info = strategyInfo[key]
                  const Icon = info.icon
                  
                  return (
                    <div key={key} className="w-full flex-shrink-0 px-2">
                      <div className="glass-card rounded-xl p-6 border border-white/10">
                        <div 
                          className="w-16 h-16 rounded-lg flex items-center justify-center mb-4"
                          style={{ 
                            background: `linear-gradient(135deg, ${info.color}30, ${info.color}20)`,
                            border: `1px solid ${info.color}40`
                          }}
                        >
                          <Icon className="w-9 h-9" style={{ color: info.color }} />
                        </div>
                        
                        <h3 className="text-2xl font-bold text-white mb-2 tech-heading">{info.name}</h3>
                        <p className="text-sm text-gray-400 font-semibold mb-3 mono">{info.short}</p>
                        <p className="text-sm text-gray-300 leading-relaxed mb-4">{info.description}</p>
                        
                        <div className="pt-4 border-t border-white/10">
                          <p className="text-xs font-bold text-gray-400 mb-1 mono">EXAMPLE:</p>
                          <p className="text-xs text-gray-400 mono">{info.example}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-4 mt-6">
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={prevStrategy}
                className="w-10 h-10 rounded-lg glass-card border border-white/10 flex items-center justify-center hover:border-[#00f0ff]/50 transition-all"
              >
                <ArrowRight className="w-5 h-5 text-gray-400 transform rotate-180" />
              </motion.button>
              
              <div className="flex gap-2">
                {strategies.map((_, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setCurrentStrategyIndex(index)}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStrategyIndex ? 'w-8 bg-[#00f0ff]' : 'w-2 bg-white/20'
                    }`}
                    whileHover={{ scale: 1.2 }}
                  />
                ))}
              </div>
              
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={nextStrategy}
                className="w-10 h-10 rounded-lg glass-card border border-white/10 flex items-center justify-center hover:border-[#00f0ff]/50 transition-all"
              >
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </motion.button>
            </div>
          </div>

          <div className="text-center relative z-10">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(0, 240, 255, 0.9)" }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowStrategyModal(true)}
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%)',
                color: '#000',
                boxShadow: '0 0 30px rgba(0, 240, 255, 0.7), inset 0 0 20px rgba(255, 255, 255, 0.3)',
                border: '2px solid #00f0ff',
                fontWeight: '900',
                textTransform: 'uppercase',
                letterSpacing: '1px'
              }}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-bold"
            >
              <Terminal className="w-5 h-5" />
              ACCESS FULL ANALYSIS
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </AnimatedSection>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
        <div className="grid-background"></div>
        <div className="scanline"></div>
        <div className="particles"></div>

        <div className="container mx-auto px-4 py-12 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <motion.h1
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.8 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 tech-heading inline-block"
              style={{
                background: 'linear-gradient(135deg, #00f0ff 0%, #00d4ff 100%)',
                color: '#000000',
                padding: '16px 40px',
                borderRadius: '20px',
                boxShadow: `
                  0 0 40px rgba(0, 240, 255, 0.9),
                  0 0 80px rgba(0, 240, 255, 0.6),
                  inset 0 0 30px rgba(255, 255, 255, 0.3)
                `,
                border: '3px solid #00f0ff',
                fontWeight: '900',
                letterSpacing: '2px'
              }}
            >
              DebtClear AI
            </motion.h1>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xl md:text-2xl text-gray-400 mb-8 font-medium"
            >
              Quantum-Powered Debt Optimization <span className="text-[#00ff88]">Engine</span>
            </motion.p>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap justify-center gap-4"
            >
              {[
                { text: "MSc FinTech", icon: Terminal, color: "#00f0ff" },
                { text: "Bank-Grade", icon: Cpu, color: "#00ff88" },
                { text: "100% Free", icon: Sparkles, color: "#b388ff" },
                { text: "Privacy First", icon: Activity, color: "#ff006e" }
              ].map((badge, index) => {
                const IconComponent = badge.icon
                return (
                  <motion.span
                    key={badge.text}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 + index * 0.1, type: "spring" }}
                    whileHover={{ scale: 1.1, y: -2 }}
                    className="px-6 py-3 badge-glow rounded-full text-sm font-bold mono flex items-center gap-2"
                    style={{ color: badge.color }}
                  >
                    <IconComponent className="w-4 h-4" />
                    {badge.text}
                  </motion.span>
                )
              })}
            </motion.div>
          </motion.div>

          {!results && <StrategyCards />}

          <AnimatedSection delay={0.2}>
            <div className="max-w-5xl mx-auto mb-12 glass-card rounded-2xl p-8 md:p-12 relative overflow-hidden border border-white/10">
              <motion.h2
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-white mb-8 text-center relative z-10 tech-heading flex items-center justify-center gap-3"
              >
                <Code className="w-8 h-8 text-[#00f0ff]" />
                How Our <span className="neon-text-cyan">System</span> Works
              </motion.h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                {[
                  {
                    icon: Terminal,
                    color: "#00f0ff",
                    title: "Proven Algorithms",
                    desc: "Industry-standard Avalanche and Snowball methods, mathematically proven to minimize interest"
                  },
                  {
                    icon: Cpu,
                    color: "#00ff88",
                    title: "Explainable AI",
                    desc: "Powered by SHAP analysis - the same technology banks use. You see exactly WHY each debt is prioritized"
                  },
                  {
                    icon: Activity,
                    color: "#b388ff",
                    title: "Compound Interest Math",
                    desc: "Calculations based on actual compound interest formulas - the same math your creditors use"
                  },
                  {
                    icon: Sparkles,
                    color: "#ff006e",
                    title: "Personalized Results",
                    desc: "Every calculation is tailored to your exact balances, interest rates, and monthly budget"
                  }
                ].map((item, index) => {
                  const IconComponent = item.icon
                  return (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ scale: 1.03, y: -5 }}
                      className="flex items-start gap-4 p-6 rounded-xl hover-glow transition-all border border-white/5 hover:border-white/20 glass-card-hover"
                    >
                      <motion.div
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                        className="flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center"
                        style={{ 
                          background: `linear-gradient(135deg, ${item.color}30, ${item.color}20)`,
                          border: `1px solid ${item.color}40`,
                          boxShadow: `0 0 20px ${item.color}30`
                        }}
                      >
                        <IconComponent className="w-6 h-6" style={{ color: item.color }} />
                      </motion.div>
                      <div>
                        <h3 className="font-bold text-white mb-2 text-lg">{item.title}</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </AnimatedSection>

          <AnimatedSection delay={0.3}>
            <div className="max-w-5xl mx-auto glass-card rounded-2xl p-8 md:p-12 relative overflow-hidden border border-white/10">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-3xl md:text-4xl font-bold text-white mb-8 relative z-10 tech-heading flex items-center gap-3"
              >
                <Terminal className="w-8 h-8 text-[#ff006e]" />
                Enter Your <span className="neon-text-cyan">Debt Data</span>
              </motion.h2>

              <div className="space-y-6 relative z-10">
                {debts.map((debt, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="p-6 md:p-8 glass-card rounded-xl border border-white/10 hover:border-[#00f0ff]/30 transition-all"
                  >
                    <h3 className="font-bold text-white mb-6 text-lg flex items-center gap-2 mono">
                      <span 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{ 
                          background: 'linear-gradient(135deg, #00f0ff30, #00ff8830)',
                          border: '1px solid #00f0ff40'
                        }}
                      >
                        {index + 1}
                      </span>
                      DEBT ENTRY #{index + 1}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2 mono">
                          DEBT TYPE
                        </label>
                        <select
                          value={debt.type}
                          onChange={(e) => handleTypeChange(index, e.target.value)}
                          className="w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#00f0ff] focus:border-[#00f0ff] transition-all bg-[#1a1a1a] text-white"
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
                        <label className="block text-sm font-semibold text-gray-400 mb-2 mono">
                          DEBT NAME
                        </label>
                        <input
                          type="text"
                          value={debt.name}
                          onChange={(e) => updateDebt(index, 'name', e.target.value)}
                          className="w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#00f0ff] focus:border-[#00f0ff] transition-all bg-[#1a1a1a] text-white"
                          placeholder="e.g., Barclaycard"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2 mono">
                          BALANCE (£)
                        </label>
                        <input
                          type="number"
                          value={debt.balance || ''}
                          onChange={(e) => updateDebt(index, 'balance', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#00f0ff] focus:border-[#00f0ff] transition-all bg-[#1a1a1a] text-white mono"
                          placeholder="2400"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-400 mb-2 mono">
                          INTEREST RATE (APR %)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={debt.apr || ''}
                          onChange={(e) => updateDebt(index, 'apr', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#00f0ff] focus:border-[#00f0ff] transition-all bg-[#1a1a1a] text-white mono"
                          placeholder="24.9"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-400 mb-2 mono">
                          MINIMUM PAYMENT (£)
                        </label>
                        <input
                          type="number"
                          value={debt.minPayment || ''}
                          onChange={(e) => updateDebt(index, 'minPayment', parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-3 border border-white/10 rounded-xl focus:ring-2 focus:ring-[#00f0ff] focus:border-[#00f0ff] transition-all bg-[#1a1a1a] text-white mono"
                          placeholder="60"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={addDebt}
                  className="w-full px-6 py-4 glass-card border border-white/20 hover:border-[#00ff88]/50 text-white rounded-xl transition-all font-semibold text-lg mono"
                >
                  + ADD ANOTHER DEBT
                </motion.button>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="mt-10 p-8 glass-card rounded-xl border border-[#00f0ff]/20 relative z-10"
              >
                <label className="block text-xl font-bold text-white mb-4 mono flex items-center gap-2">
                  <Activity className="w-6 h-6 text-[#00f0ff]" />
                  MONTHLY DEBT PAYMENT BUDGET (£)
                </label>
                <input
                  type="number"
                  value={monthlyBudget || ''}
                  onChange={(e) => setMonthlyBudget(parseFloat(e.target.value) || 0)}
                  className="w-full px-6 py-4 text-2xl border-2 border-[#00f0ff]/30 rounded-xl focus:ring-4 focus:ring-[#00f0ff]/50 focus:border-[#00f0ff] transition-all bg-[#1a1a1a] text-white mono"
                  placeholder="500"
                />
                <p className="text-sm text-gray-400 mt-3">
                  Total amount you can allocate across ALL debts each month
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                className="mt-8 p-6 glass-card rounded-xl border border-[#00ff88]/20 relative z-10"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(135deg, #00ff8830, #00ff8820)',
                      border: '1px solid #00ff8840'
                    }}
                  >
                    <CheckCircle className="w-6 h-6 text-[#00ff88]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 mono">ENCRYPTED & PRIVATE</h4>
                    <p className="text-sm text-gray-400">Zero data retention. All calculations happen in real-time with bank-grade encryption.</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ 
                      background: 'linear-gradient(135deg, #00f0ff30, #00f0ff20)',
                      border: '1px solid #00f0ff40'
                    }}
                  >
                    <Info className="w-6 h-6 text-[#00f0ff]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white mb-2 mono">MATHEMATICAL OPTIMIZATION</h4>
                    <p className="text-sm text-gray-400">Results based on proven algorithms. Always verify with creditors and consider professional financial advice.</p>
                  </div>
                </div>
              </motion.div>

              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 0 60px rgba(0, 240, 255, 1)" }}
                whileTap={{ scale: 0.98 }}
                onClick={calculateOptimization}
                disabled={loading}
                className="w-full mt-10 px-10 py-5 text-xl font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed relative z-10 overflow-hidden group"
                style={{
                  background: loading 
                    ? 'linear-gradient(135deg, #00f0ff30 0%, #00ff8830 100%)'
                    : 'linear-gradient(135deg, #00f0ff 0%, #00ff88 100%)',
                  color: '#000',
                  boxShadow: '0 0 40px rgba(0, 240, 255, 0.8), inset 0 0 30px rgba(255, 255, 255, 0.4)',
                  border: '3px solid #00f0ff',
                  fontWeight: '900',
                  textTransform: 'uppercase',
                  letterSpacing: '2px'
                }}
              >
                <span className="relative z-10 flex items-center justify-center gap-3 mono font-black">
                  {loading ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Cpu className="w-6 h-6" />
                      </motion.div>
                      PROCESSING ALGORITHMS...
                    </>
                  ) : (
                    <>
                      <Terminal className="w-6 h-6" />
                      EXECUTE OPTIMIZATION
                      <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </div>
          </AnimatedSection>

          {results && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              id="results"
              className="max-w-5xl mx-auto mt-12 space-y-10"
            >
              <p className="text-white text-center text-2xl">✅ Results section works! Your optimization is ready.</p>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16 py-12 border-t border-white/10 relative"
          >
            <div className="relative z-10">
              <motion.p
                whileHover={{ scale: 1.05 }}
                className="text-lg font-bold text-white mb-2 tech-heading"
              >
                Built by <span className="neon-text-cyan">Kanyinsola Ogunbanjo</span>, MSc FinTech
              </motion.p>
              <p className="text-sm text-gray-400 mono">
                Powered by Explainable AI & Proven Optimization Algorithms
              </p>
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2, type: "spring" }}
                className="mt-6 flex justify-center gap-3"
              >
                {[Terminal, Code, Cpu, Activity, Sparkles].map((Icon, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    whileHover={{ scale: 1.2, rotate: 360 }}
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ 
                      background: 'linear-gradient(135deg, #00f0ff20, #00ff8820)',
                      border: '1px solid rgba(0, 240, 255, 0.3)'
                    }}
                  >
                    <Icon className="w-5 h-5 text-[#00f0ff]" />
                  </motion.div>
                ))}
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="mt-6 flex justify-center gap-2 text-xs text-gray-500 mono"
              >
                <span>v2.0.1</span>
                <span>•</span>
                <span>DARK MODE ENABLED</span>
                <span>•</span>
                <span>© 2026</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>

      {showEmailDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black bg-opacity-90 backdrop-blur-md flex items-center justify-center z-50 p-4 modal-backdrop"
          onClick={() => setShowEmailDialog(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="glass-card rounded-2xl p-8 max-w-md w-full mx-4 relative overflow-hidden border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-bold text-white tech-heading flex items-center gap-3">
                  <Terminal className="w-8 h-8 text-[#00f0ff]" />
                  Email Plan
                </h3>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowEmailDialog(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors border border-white/10"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </motion.button>
              </div>
              
              <p className="text-gray-400 mb-6">
                Receive your personalized debt freedom plan via email
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2 mono">
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:ring-4 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all bg-[#1a1a1a] text-white"
                    placeholder="John Smith"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-gray-400 mb-2 mono">
                    YOUR EMAIL
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-white/20 rounded-xl focus:ring-4 focus:ring-[#00ff88]/50 focus:border-[#00ff88] transition-all bg-[#1a1a1a] text-white mono"
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-8">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendEmail}
                  disabled={sendingEmail}
                  className="flex-1 px-6 py-3 btn-neon-green rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed mono"
                >
                  {sendingEmail ? 'SENDING...' : 'SEND EMAIL'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowEmailDialog(false)
                    setUserName('')
                    setUserEmail('')
                  }}
                  className="px-6 py-3 glass-card border border-white/20 text-white font-bold rounded-xl hover:border-white/40 transition-colors mono"
                >
                  CANCEL
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <StrategyModal />
    </>
  )
}

export default App
