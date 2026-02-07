import { useState, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, ChevronRight, MoreHorizontal, LogOut, Settings, Bell } from 'lucide-react';
import { useUser } from '@/contexts/UserContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { useFeatureAccess } from '@/hooks/useFeatureAccess';
import { navigationConfig, reportingConfig, NavItemConfig } from './Sidebar';
import { apiClient } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { PrefetchNavLink } from '@/components/ui/PrefetchNavLink';

export default function MobileBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, hasRole } = useUser();
  const { unreadCount } = useNotifications();
  const { hasAccess } = useFeatureAccess();
  const toast = useToast();
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState<NavItemConfig | null>(null);

  const isAdmin = hasRole(['admin', 'owner']);
  const companyPlan = user?.subscriptionPlan || 'trial';

  const getVisibleItems = (items: NavItemConfig[]) => {
    return items.filter(item => {
      if (item.adminOnly && !isAdmin) return false;
      return true;
    });
  };

  const allNavItems = useMemo(() => getVisibleItems(navigationConfig), [user, companyPlan]);
  const allReportingItems = useMemo(() => getVisibleItems(reportingConfig), [user, companyPlan]);

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

  const handleCloseMore = () => {
    setIsMoreOpen(false);
    setActiveSubmenu(null);
  };


  const handleLogout = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    }
    navigate('/login');
  };

  const NavItem = ({ item, onClick }: { item: NavItemConfig; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const label = getMobileLabel(item.label);
    const locked = Boolean(item.feature && !hasAccess(item.feature));

    return (
      <PrefetchNavLink
        to={item.href}
        prefetchUrl={`/api${item.href.replace('/dashboard', '')}`}
        onClick={(e) => {
          if (locked) {
            e.preventDefault();
            toast.warning('This feature is unavailable on your current plan.');
            return;
          }
          onClick?.();
        }}
        className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 group ${active ? 'text-[#0F5D5D]' : 'text-gray-400 hover:text-gray-600'
          }`}
      >
        <div className={`p-1.5 rounded-xl mb-1 transition-all duration-200 ${active ? 'bg-[#0F5D5D]/10 translate-y-[-2px]' : 'group-hover:bg-gray-50'
          }`}>
          <Icon className={`w-6 h-6 ${active ? 'fill-current' : ''}`} strokeWidth={active ? 2.5 : 2} />
        </div>
        <span className={`text-[10px] font-medium tracking-tight truncate max-w-[80px] ${active ? 'font-semibold' : ''
          }`}>
          {label}
        </span>
      </PrefetchNavLink>
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
            className={`flex flex-col items-center justify-center w-full h-full transition-all duration-200 group ${isMoreOpen ? 'text-[#0F5D5D]' : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <div className={`p-1.5 rounded-xl mb-1 transition-all duration-200 ${isMoreOpen ? 'bg-[#0F5D5D]/10 translate-y-[-2px]' : 'group-hover:bg-gray-50'
              }`}>
              {isMoreOpen ? (
                <MoreHorizontal className="w-6 h-6 fill-current" strokeWidth={2.5} />
              ) : (
                <Menu className="w-6 h-6" strokeWidth={2} />
              )}
            </div>
            <span className={`text-[10px] font-medium tracking-tight ${isMoreOpen ? 'font-semibold' : ''
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
            onClick={handleCloseMore}
          />

          {/* Drawer Content */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto flex flex-col shadow-xl animate-in slide-in-from-bottom duration-300">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between z-10 transition-colors">
              <div className="flex items-center gap-2">
                {activeSubmenu && (
                  <button
                    onClick={() => setActiveSubmenu(null)}
                    className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-primary font-medium"
                  >
                    <ChevronRight className="w-5 h-5 rotate-180" />
                    <span>Back</span>
                  </button>
                )}
                <span className="font-bold text-lg text-gray-900">
                  {activeSubmenu ? activeSubmenu.label : 'Menu'}
                </span>
              </div>
              <button
                onClick={handleCloseMore}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="p-4 space-y-6 pb-24 animate-in fade-in duration-300">
              {activeSubmenu ? (
                /* Submenu View */
                <div className="space-y-1">
                  {getVisibleItems(activeSubmenu.submenu || []).map((subItem) => {
                    const locked = Boolean(subItem.feature && !hasAccess(subItem.feature));
                    return (
                    <Link
                      key={subItem.href}
                      to={subItem.href}
                      onClick={(e) => {
                        if (locked) {
                          e.preventDefault();
                          toast.warning('This feature is unavailable on your current plan.');
                          return;
                        }
                        handleCloseMore();
                      }}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/5 rounded-lg text-primary">
                          <subItem.icon className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900">{subItem.label}</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                    );
                  })}
                </div>
              ) : (
                /* Root Menu View */
                <>
                  {/* Secondary Nav Items */}
                  {secondaryItems.length > 0 && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-2">Apps</h3>
                      {secondaryItems.map((item) => {
                        const hasSub = item.submenu && item.submenu.length > 0;
                        return (
                          <div key={item.href}>
                            {hasSub ? (
                              <button
                                onClick={() => setActiveSubmenu(item)}
                                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-primary/5 rounded-lg text-primary">
                                    <item.icon className="w-5 h-5" />
                                  </div>
                                  <span className="font-medium text-gray-900">{item.label}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-gray-400" />
                              </button>
                            ) : (
                              <Link
                                to={item.href}
                                onClick={(e) => {
                                  if (item.feature && !hasAccess(item.feature)) {
                                    e.preventDefault();
                                    toast.warning('This feature is unavailable on your current plan.');
                                    return;
                                  }
                                  handleCloseMore();
                                }}
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
                            )}
                          </div>
                        );
                      })}
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
                          onClick={handleCloseMore}
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

                    {/* Inbox Link (Mobile) */}
                    <Link
                      to="/dashboard/inbox"
                      onClick={handleCloseMore}
                      className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 rounded-lg text-teal-600 relative">
                          <Bell className="w-5 h-5" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">Inbox</span>
                      </div>
                      <div className="flex items-center gap-2">
                         {unreadCount > 0 && (
                           <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                             {unreadCount} new
                           </span>
                         )}
                         <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </Link>

                    {/* Settings Button */}
                    <Link
                      to="/dashboard/settings"
                      onClick={handleCloseMore}
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

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 rounded-lg text-red-600">
                          <LogOut className="w-5 h-5" />
                        </div>
                        <span className="font-medium text-gray-900">Logout</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
