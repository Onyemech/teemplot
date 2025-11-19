import { DatabaseFactory } from '../infrastructure/database/DatabaseFactory';
import { IDatabase } from '../infrastructure/database/IDatabase';
import { logger } from '../utils/logger';

export interface CompanyStats {
  id: string;
  name: string;
  email: string;
  plan: string;
  status: string;
  employeeCount: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  trialEndDate?: Date;
  onboardingCompleted: boolean;
  createdAt: Date;
}

export interface RevenueStats {
  totalMonthlyRevenue: number;
  totalYearlyRevenue: number;
  silverCompanies: number;
  goldCompanies: number;
  trialCompanies: number;
  totalCompanies: number;
  totalEmployees: number;
}

export interface ExpenseRecord {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  createdBy: string;
}

export class SuperAdminService {
  private db: IDatabase;

  constructor() {
    this.db = DatabaseFactory.getPrimaryDatabase();
  }

  async getAllCompanies(filter?: {
    plan?: 'silver' | 'gold' | 'trial';
    status?: 'active' | 'trial' | 'pending_payment' | 'suspended';
  }): Promise<CompanyStats[]> {
    let whereClause: any = { deleted_at: null };

    if (filter?.status) {
      whereClause.subscription_status = filter.status;
    }

    const companies = await this.db.find('companies', whereClause);

    const stats: CompanyStats[] = [];

    for (const company of companies) {
      // Filter by plan if specified
      if (filter?.plan) {
        const planType = company.subscription_plan?.startsWith(filter.plan);
        if (!planType) continue;
      }

      // Count employees
      const employees = await this.db.count('users', {
        company_id: company.id,
        deleted_at: null,
      });

      // Calculate revenue
      const companySize = parseInt(company.company_size || '0');
      const plan = company.subscription_plan || 'trial';
      
      let monthlyRevenue = 0;
      let yearlyRevenue = 0;

      if (plan.includes('monthly')) {
        const pricePerEmployee = plan.startsWith('silver') 
          ? parseInt(process.env.SILVER_MONTHLY_PLAN || '1200')
          : parseInt(process.env.GOLD_MONTHLY_PLAN || '2500');
        monthlyRevenue = pricePerEmployee * companySize;
        yearlyRevenue = monthlyRevenue * 12;
      } else if (plan.includes('yearly')) {
        const pricePerEmployee = plan.startsWith('silver')
          ? parseInt(process.env.SILVER_YEARLY_PLAN || '12000')
          : parseInt(process.env.GOLD_YEARLY_PLAN || '25000');
        yearlyRevenue = pricePerEmployee * companySize;
        monthlyRevenue = yearlyRevenue / 12;
      }

      stats.push({
        id: company.id,
        name: company.name,
        email: company.email,
        plan: company.subscription_plan,
        status: company.subscription_status,
        employeeCount: employees,
        monthlyRevenue,
        yearlyRevenue,
        trialEndDate: company.trial_end_date,
        onboardingCompleted: company.onboarding_completed || false,
        createdAt: company.created_at,
      });
    }

    return stats;
  }

  async getRevenueStats(): Promise<RevenueStats> {
    const companies = await this.getAllCompanies();

    const stats: RevenueStats = {
      totalMonthlyRevenue: 0,
      totalYearlyRevenue: 0,
      silverCompanies: 0,
      goldCompanies: 0,
      trialCompanies: 0,
      totalCompanies: companies.length,
      totalEmployees: 0,
    };

    for (const company of companies) {
      stats.totalMonthlyRevenue += company.monthlyRevenue;
      stats.totalYearlyRevenue += company.yearlyRevenue;
      stats.totalEmployees += company.employeeCount;

      if (company.plan?.startsWith('silver')) {
        stats.silverCompanies++;
      } else if (company.plan?.startsWith('gold')) {
        stats.goldCompanies++;
      } else if (company.plan === 'trial') {
        stats.trialCompanies++;
      }
    }

    return stats;
  }

  async getCompanyDetails(companyId: string): Promise<any> {
    const company = await this.db.findOne('companies', { id: companyId });

    if (!company) {
      throw new Error('Company not found');
    }

    const users = await this.db.find('users', {
      company_id: companyId,
      deleted_at: null,
    });

    const departments = await this.db.find('departments', {
      company_id: companyId,
      deleted_at: null,
    });

    return {
      ...company,
      users,
      departments,
      userCount: users.length,
      departmentCount: departments.length,
    };
  }

  async recordExpense(data: {
    description: string;
    amount: number;
    category: string;
    createdBy: string;
  }): Promise<ExpenseRecord> {
    // Create expenses table if it doesn't exist
    const expense = await this.db.insert('expenses', {
      id: require('uuid').v4(),
      description: data.description,
      amount: data.amount,
      category: data.category,
      created_by: data.createdBy,
      createdBy: data.createdBy,
      date: new Date(),
      created_at: new Date(),
    });

    logger.info(`Expense recorded: ${data.description} - ₦${data.amount}`);

    return expense;
  }

  async getExpenses(filter?: {
    startDate?: Date;
    endDate?: Date;
    category?: string;
  }): Promise<ExpenseRecord[]> {
    let whereClause: any = {};

    if (filter?.category) {
      whereClause.category = filter.category;
    }

    const expenses = await this.db.find('expenses', whereClause);

    // Filter by date range if specified
    if (filter?.startDate || filter?.endDate) {
      return expenses.filter((expense: any) => {
        const expenseDate = new Date(expense.date);
        if (filter.startDate && expenseDate < filter.startDate) return false;
        if (filter.endDate && expenseDate > filter.endDate) return false;
        return true;
      });
    }

    return expenses;
  }

  async getProfitAnalysis(month?: number, year?: number): Promise<{
    revenue: number;
    expenses: number;
    profit: number;
    profitMargin: number;
  }> {
    const stats = await this.getRevenueStats();
    const revenue = stats.totalMonthlyRevenue;

    // Get expenses for the period
    const startDate = month && year ? new Date(year, month - 1, 1) : undefined;
    const endDate = month && year ? new Date(year, month, 0) : undefined;

    const expenses = await this.getExpenses({ startDate, endDate });
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const profit = revenue - totalExpenses;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      expenses: totalExpenses,
      profit,
      profitMargin,
    };
  }

  async reviewCompanyDocuments(companyId: string): Promise<{
    cacDocument?: string;
    proofOfAddress?: string;
    companyPolicy?: string;
  }> {
    const company = await this.db.findOne('companies', { id: companyId });

    if (!company) {
      throw new Error('Company not found');
    }

    return {
      cacDocument: company.cac_document_url,
      proofOfAddress: company.proof_of_address_url,
      companyPolicy: company.company_policy_url,
    };
  }

  async approveCompany(companyId: string, approvedBy: string): Promise<void> {
    await this.db.update(
      'companies',
      {
        subscription_status: 'active',
        updated_at: new Date(),
      },
      { id: companyId }
    );

    logger.info(`Company ${companyId} approved by ${approvedBy}`);
  }

  async suspendCompany(companyId: string, reason: string, suspendedBy: string): Promise<void> {
    await this.db.update(
      'companies',
      {
        subscription_status: 'suspended',
        is_active: false,
        updated_at: new Date(),
      },
      { id: companyId }
    );

    logger.info(`Company ${companyId} suspended by ${suspendedBy}: ${reason}`);
  }
}

export const superAdminService = new SuperAdminService();
