
import emailjs from '@emailjs/browser'

interface EmailData {
  userName: string
  userEmail: string
  months: number
  strategy: string
  interest: number
  savings: number
  explanation: string
}

export const sendEmail = async (data: EmailData): Promise<boolean> => {
  try {
    // Initialize EmailJS with your public key
    emailjs.init('bNqei9h8D8CyROn-4')
    
    // Calculate target date
    const targetDate = new Date()
    targetDate.setMonth(targetDate.getMonth() + data.months)
    const formattedDate = targetDate.toLocaleDateString('en-GB', { 
      month: 'long', 
      year: 'numeric' 
    })
    
    // Send email
    const response = await emailjs.send(
      'service_eup83su',
      'template_bgbp4qf',
      {
        to_name: data.userName,
        reply_to: data.userEmail,  // This is the user's email for replies
        user_email: data.userEmail, // Add this for the template
        months: data.months.toString(),
        strategy: data.strategy,
        interest: data.interest.toFixed(2),
        savings: data.savings.toFixed(2),
        explanation: data.explanation,
        target_date: formattedDate
      }
    )
    
    console.log('Email sent successfully!', response)
    return true
    
  } catch (error) {
    console.error('Email sending failed:', error)
    return false
  }
}