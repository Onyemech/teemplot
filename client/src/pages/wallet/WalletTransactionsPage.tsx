import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { Card } from '@/components/ui/Card'
import { Loader2, FileText, TrendingUp, Wallet, CheckCircle2, Clock, XCircle } from 'lucide-react'

interface Transaction {
  id: string
  reference: string
  purpose: string
  amount: number
  currency: string
  status: string
  created_at: string
  paid_at?: string
}

export default function WalletTransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const response = await apiClient.get('/api/subscription/payments')
      if (response.data.success) {
        setTransactions(response.data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  const formatAmount = (amount: number, currency: string) => {
    return (amount / 100).toLocaleString(undefined, {
      style: 'currency',
      currency: currency || 'NGN',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
          </span>
        )
      case 'pending':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
            <Clock className="w-3.5 h-3.5" />
            Pending
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
            <XCircle className="w-3.5 h-3.5" />
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        )
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  const totalSpent = transactions.reduce((acc, curr) => acc + (curr.status === 'completed' ? curr.amount : 0), 0)

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-[#212121]">Wallet Transactions</h1>
        <p className="text-[#757575]">View all your subscription and payment history</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-[#0F5D5D]/10 rounded-xl">
              <Wallet className="w-6 h-6 text-[#0F5D5D]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#757575]">Total Spent</p>
              <p className="text-xl font-bold text-[#212121]">
                {formatAmount(totalSpent, 'NGN')}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#757575]">Total Transactions</p>
              <p className="text-xl font-bold text-[#212121]">{transactions.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-xl">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#757575]">Successful</p>
              <p className="text-xl font-bold text-[#212121]">
                {transactions.filter(t => t.status === 'completed').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden border-[#e0e0e0]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-[#f5f5f5] text-[#757575] border-b border-[#e0e0e0]">
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Reference</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Purpose</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Amount</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Status</th>
                <th className="px-6 py-4 font-semibold uppercase tracking-wider text-[11px]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0e0e0]">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#757575]">
                    <div className="flex flex-col items-center gap-2">
                      <Wallet className="w-8 h-8 opacity-20" />
                      <p>No transactions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-[#212121] font-mono text-[13px]">{t.reference}</td>
                    <td className="px-6 py-4 text-[#757575]">
                      {t.purpose.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </td>
                    <td className="px-6 py-4 font-bold text-[#212121]">
                      {formatAmount(t.amount, t.currency)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(t.status)}
                    </td>
                    <td className="px-6 py-4 text-[#757575]">
                      {new Date(t.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
