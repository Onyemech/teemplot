import { Router } from 'express'
import { authenticateToken } from '../middleware/auth.middleware'
import { db } from '../infrastructure/database/supabase'
import crypto from 'crypto'
import { sendEmail } from '../services/email/EmailService'

const router = Router()

// Invite employee
router.post('/invite', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId
    const { email, firstName, lastName, role, position } = req.body

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return res.status(400).json({ message: 'Missing required fields' })
    }

    // Get user's company and role
    const { data: user, error: userError } = await db
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user has permission to invite (owner or admin)
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only owners and admins can invite employees' })
    }

    // Get company details and check plan limits
    const { data: company, error: companyError } = await db
      .from('companies')
      .select('id, name, subscription_plan, employee_count')
      .eq('id', user.company_id)
      .single()

    if (companyError || !company) {
      return res.status(404).json({ message: 'Company not found' })
    }

    // Check plan limits
    const planLimits: Record<string, number> = {
      free: 10,
      silver: 50,
      gold: Infinity
    }

    const limit = planLimits[company.subscription_plan] || 10
    
    if (company.employee_count >= limit) {
      return res.status(403).json({ 
        message: `You've reached the ${company.subscription_plan} plan limit of ${limit} employees. Please upgrade your plan.`,
        code: 'PLAN_LIMIT_REACHED'
      })
    }

    // Check if email already exists
    const { data: existingUser } = await db
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' })
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await db
      .from('employee_invitations')
      .select('id, status')
      .eq('email', email)
      .eq('company_id', company.id)
      .eq('status', 'pending')
      .single()

    if (existingInvitation) {
      return res.status(400).json({ message: 'Invitation already sent to this email' })
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

    // Create invitation
    const { data: invitation, error: invitationError } = await db
      .from('employee_invitations')
      .insert({
        company_id: company.id,
        invited_by: userId,
        email,
        first_name: firstName,
        last_name: lastName,
        role,
        position,
        invitation_token: invitationToken,
        status: 'pending',
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (invitationError) {
      console.error('Failed to create invitation:', invitationError)
      return res.status(500).json({ message: 'Failed to create invitation' })
    }

    // Send invitation email
    const invitationLink = `${process.env.FRONTEND_URL}/accept-invitation?token=${invitationToken}`
    
    try {
      await sendEmail({
        to: email,
        subject: `You're invited to join ${company.name} on Teemplot`,
        html: `
          <h2>Welcome to ${company.name}!</h2>
          <p>Hi ${firstName},</p>
          <p>You've been invited to join ${company.name} as a ${role}.</p>
          <p>Click the link below to accept the invitation and set up your account:</p>
          <a href="${invitationLink}" style="display: inline-block; padding: 12px 24px; background-color: #0F5D5D; color: white; text-decoration: none; border-radius: 8px; margin: 16px 0;">Accept Invitation</a>
          <p>This invitation will expire in 7 days.</p>
          <p>If you didn't expect this invitation, you can safely ignore this email.</p>
        `
      })
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError)
      // Don't fail the request if email fails
    }

    res.status(201).json({
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email: invitation.email,
        firstName: invitation.first_name,
        lastName: invitation.last_name,
        role: invitation.role
      }
    })
  } catch (error) {
    console.error('Failed to invite employee:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

// Get all invitations (for admin/owner)
router.get('/invitations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.userId

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Get user's company and role
    const { data: user, error: userError } = await db
      .from('users')
      .select('company_id, role')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Check if user has permission
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only owners and admins can view invitations' })
    }

    // Get all invitations for the company
    const { data: invitations, error: invitationsError } = await db
      .from('employee_invitations')
      .select('*')
      .eq('company_id', user.company_id)
      .order('created_at', { ascending: false })

    if (invitationsError) {
      console.error('Failed to fetch invitations:', invitationsError)
      return res.status(500).json({ message: 'Failed to fetch invitations' })
    }

    res.json(invitations)
  } catch (error) {
    console.error('Failed to fetch invitations:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
})

export default router
