import { determineCompanyPlan, getEnabledFeaturesForPlan } from '../../src/config/featureGating'

describe('featureGating', () => {
  describe('determineCompanyPlan', () => {
    it('returns trial when subscription_status is trial', () => {
      expect(determineCompanyPlan({ subscription_status: 'trial' })).toBe('trial')
    })

    it('returns trial when subscription_plan is trial', () => {
      expect(determineCompanyPlan({ subscription_plan: 'trial' })).toBe('trial')
    })

    it('returns gold when subscription_plan contains gold', () => {
      expect(determineCompanyPlan({ subscription_plan: 'gold_monthly' })).toBe('gold')
    })

    it('defaults to silver', () => {
      expect(determineCompanyPlan({ subscription_status: 'active', subscription_plan: 'silver_monthly' })).toBe('silver')
    })
  })

  describe('getEnabledFeaturesForPlan', () => {
    const prev = process.env.DISABLED_FEATURES

    afterEach(() => {
      process.env.DISABLED_FEATURES = prev
    })

    it('filters disabled features from env', () => {
      process.env.DISABLED_FEATURES = 'analytics,tasks'
      const features = getEnabledFeaturesForPlan('gold')
      expect(features.includes('analytics')).toBe(false)
      expect(features.includes('tasks')).toBe(false)
      expect(features.includes('attendance')).toBe(true)
    })
  })
})

