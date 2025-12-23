import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

interface PDFData {
  debts: Array<{
    name: string
    balance: number
    apr: number
    minPayment: number
  }>
  monthlyBudget: number
  results: any
}

export const generatePDF = (data: PDFData) => {
  try {
    const doc = new jsPDF()
    
    // Header with blue background
    doc.setFillColor(59, 130, 246)
    doc.rect(0, 0, 210, 40, 'F')
    
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(24)
    doc.text('DebtClear AI', 105, 20, { align: 'center' })
    
    doc.setFontSize(12)
    doc.text('Your Personalized Debt Freedom Plan', 105, 30, { align: 'center' })
    
    // Reset text color
    doc.setTextColor(0, 0, 0)
    
    let yPos = 50
    
    // Summary Section
    doc.setFontSize(16)
    doc.text('Your Debts Summary', 20, yPos)
    yPos += 10
    
    // Debts table
    const debtRows = data.debts.map(debt => [
      debt.name,
      `£${debt.balance.toLocaleString()}`,
      `${debt.apr}%`,
      `£${debt.minPayment}`
    ])
    
    autoTable(doc, {
      startY: yPos,
      head: [['Debt Name', 'Balance', 'APR', 'Min Payment']],
      body: debtRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15
    
    // Strategy Comparison
    doc.setFontSize(16)
    doc.text('Strategy Comparison', 20, yPos)
    yPos += 10
    
    const strategyRows = [
      [
        'Avalanche',
        `${data.results.strategies.avalanche.months_to_freedom} months`,
        `£${data.results.strategies.avalanche.total_interest.toFixed(2)}`
      ],
      [
        'Snowball',
        `${data.results.strategies.snowball.months_to_freedom} months`,
        `£${data.results.strategies.snowball.total_interest.toFixed(2)}`
      ],
      [
        'Hybrid (Recommended)',
        `${data.results.strategies.hybrid.months_to_freedom} months`,
        `£${data.results.strategies.hybrid.total_interest.toFixed(2)}`
      ]
    ]
    
    autoTable(doc, {
      startY: yPos,
      head: [['Strategy', 'Time to Freedom', 'Total Interest']],
      body: strategyRows,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    })
    
    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 15
    
    // AI Explanations
    doc.setFontSize(16)
    doc.text('AI Recommendation Explanation', 20, yPos)
    yPos += 10
    
    doc.setFontSize(11)
    
    data.results.explanations.forEach((exp: any) => {
      if (yPos > 250) {
        doc.addPage()
        yPos = 20
      }
      
      doc.setFontSize(12)
      doc.text(`${exp.rank}. ${exp.debt_name}`, 20, yPos)
      yPos += 7
      
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(exp.explanation, 170)
      doc.text(lines, 25, yPos)
      yPos += lines.length * 7 + 5
    })
    
    // Footer
    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text('Built by Kanyinsola Ogunbanjo | MSc FinTech', 105, 280, { align: 'center' })
    doc.text('Using Explainable AI for smarter financial decisions', 105, 287, { align: 'center' })
    
    // Save the PDF
    const date = new Date().toISOString().split('T')[0]
    doc.save(`DebtClear-AI-Plan-${date}.pdf`)
    
    console.log('PDF generated successfully!')
    
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Error generating PDF. Check console for details.')
  }
}