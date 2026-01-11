import { useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronRight, MoreHorizontal, LogOut, Settings } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { navigationConfig, reportingConfig, NavItemConfig } from './Sidebar';
import { apiClient } from '@/lib/api';

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const { user, hasRole } = useUser();
  const { hasAccess } = useFeatureAccess();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const isAdmin = hasRole(['admin', 'owner']);
  const companyPlan = user?.subscriptionPlan || 'trial';

  // Filter accessible items
  const getAccessibleItems = (items: NavItemConfig[]) => {
    return items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      if (item.feature && !hasAccess(item.feature)) return false; 
      return true;
    });
  };

  const allNavItems = useMemo(() => getAccessibleItems(navigationConfig), [user, companyPlan]);
  const allReportingItems = useMemo(() => getAccessibleItems(reportingConfig), [user, companyPlan]);

  // Select top items for the bar
  const primaryItems = allNavItems.slice(0, 4);
  
  // The rest go into "More"
  const secondaryItems = allNavItems.slice(4);
  
  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href;
    return pathname.startsWith(href);
  };

  const getMobileLabel = (label: string) => {
    const map: Record<string, string> = {
      'Leave Management': 'Leave',
      'Employee Management': 'Team',
      'Payroll Management': 'Payroll',
      'Performance Reviews': 'Reviews',
    };
    return map[label] || label;
  };

  const handleClockOut = async () => {
    // This is a quick clock out from the menu, usually redirects to dashboard or triggers action
    // For now, let's redirect to dashboard which has the clock out logic
    setIsMoreOpen(false);
    window.location.href = '/dashboard';
  };

  const NavItem = ({ item, onClick }: { item: NavItemConfig; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const label = getMobileLabel(item.label);

    return (
      <Link
        to={item.href}
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 group ${
          active ? 'text-[#0F5D5D]' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <div className={`p-1.5 rounded-xl mb-1 transition-all duration-200 ${
          active ? 'bg-[#0F5D5D]/10 translate-y-[-2px]' : 'group-hover:bg-gray-50'
        }`}>
          <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-medium tracking-tight truncate max-w-[80px] ${
          active ? 'font-semibold' : ''
        }`}>
          {label}
        </span>
      </Link>
    );
  };

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 md:hidden pb-safe">
        <div className="grid grid-cols-5 h-[84px] items-start pt-3 px-2">
          {primaryItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
          
          <button
            onClick={() => setIsMoreOpen(true)}
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 group ${
              isMoreOpen ? 'text-[#0F5D5D]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 transition-all duration-200 ${
              isMoreOpen ? 'bg-[#0F5D5D]/10 translate-y-[-2px]' : 'group-hover:bg-gray-50'
            }`}>
              {isMoreOpen ? (
                <MoreHorizontal className="w-6 h-6 fill-current" strokeWidth={2.5} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={2} />
              )}
            </div>
            <span className={`text-[10px] font-medium tracking-tight ${
              isMoreOpen ? 'font-semibold' : ''
            }`}>
              More
            </span>
          </button>
        </div>
      </div>

      {/* More Menu Drawer */}
      {isMoreOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMoreOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-xl animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10">
              <span className="font-bold text-lg text-gray-900">Menu</span>
              <button 
                onClick={() => setIsMoreOpen(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-6 pb-24">
              {/* Secondary Nav Items */}
              {secondaryItems.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Apps</h3>
                  {secondaryItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Reporting Section */}
              {allReportingItems.length > 0 && (
                <div className="space-y-1">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Reporting</h3>
                  {allReportingItems.map((item) => (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setIsMoreOpen(false)}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                          <item.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900">{item.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))}
                </div>
              )}

              {/* Quick Actions Section */}
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Quick Actions</h3>
                
                {/* Clock Out Button */}
                <button
                  onClick={handleClockOut}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 rounded-lg text-red-600">
                      <LogOut className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">Clock Out</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>

                {/* Settings Button */}
                <Link
                  to="/dashboard/settings"
                  onClick={() => setIsMoreOpen(false)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg text-gray-600">
                      <Settings className="w-5 h-5" />
                    </div>
                    <span className="font-medium text-gray-900">Settings</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
