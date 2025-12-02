import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { db } from '../infrastructure/database/supabase'

const router = Router()

// Get company info
router.get('/info', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Get user's company
    const { data: user, error: userError } = await db
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get company details
    const { data: company, error: companyError } = await db
      .from('companies')
      .select('id, name, logo_url, subscription_plan, subscription_status, subscription_end_date, employee_count')
      .eq('id', user.company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ message: 'Company not found' })
    }

    res.json(company)
  } catch (error) {
    console.error('Failed to fetch company info:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get subscription status
router.get('/subscription-status', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Get user's company
    const { data: user, error: userError } = await db
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Get subscription details
    const { data: company, error: companyError } = await db
      .from('companies')
      .select('subscription_plan, subscription_status, subscription_end_date, subscription_start_date')
      .eq('id', user.company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ message: 'Company not found' })
    }

    res.json({
      subscriptionPlan: company.subscription_plan,
      subscriptionStatus: company.subscription_status,
      subscriptionEndDate: company.subscription_end_date,
      subscriptionStartDate: company.subscription_start_date
    })
  } catch (error) {
    console.error('Failed to fetch subscription status:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
