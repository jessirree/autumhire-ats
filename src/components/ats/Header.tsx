import { Bell, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface HeaderProps {
  userName: string;
  userRole: string;
  onRoleSwitch?: () => void;
}

export function Header({ userName, userRole, onRoleSwitch }: HeaderProps) {
  return (
    <header className="h-20 bg-sidebar flex items-center justify-between px-8 z-20 border-b border-gray-200/50">
      <div className="flex items-center gap-8 flex-1">
        {/* Logo */}
        <div className="flex items-center cursor-pointer shrink-0">
          <span className="text-2xl font-bold text-[#D9534F] tracking-tight">Autum</span><span className="text-2xl font-bold text-[#2F5233] tracking-tight">hire</span>
        </div>

        {/* Search Bar */}
        <div className="relative flex-1 max-w-xl group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-autumn-charcoal/40 group-focus-within:text-autumn-orange transition-colors" />
          <input
            type="text"
            placeholder="Search jobs, candidates, applications..."
            className="w-full pl-12 pr-4 py-2.5 bg-white/60 border border-transparent rounded-xl focus:outline-none focus:ring-2 focus:ring-autumn-orange/20 focus:bg-white transition-all shadow-sm hover:shadow-md text-sm"
          />
        </div>
      </div>
      <div className="flex items-center gap-6 ml-4">
        <button className="relative p-2 !text-gray-700 hover:bg-white/50 hover:!text-autumn-orange rounded-full transition-all duration-200">
          <Bell className="size-6" />
          <span className="absolute top-2 right-2 size-2.5 bg-autumn-red rounded-full border-2 border-sidebar" />
        </button>
        <div className="h-8 w-px bg-autumn-charcoal/10" />
        <div className="flex items-center gap-3">
          <div className="size-10 bg-gradient-to-br from-autumn-orange to-autumn-yellow text-white rounded-full flex items-center justify-center font-bold shadow-sm">
            {userName.charAt(0)}
          </div>
          <div className="text-sm">
            <p className="font-semibold !text-gray-900">{userName}</p>
            <p className="!text-gray-600 text-xs">{userRole}</p>
          </div>
        </div>
        {onRoleSwitch && (
          <>
            <div className="h-8 w-px bg-autumn-charcoal/10" />
            <Button
              variant="outline"
              size="sm"
              onClick={onRoleSwitch}
              className="border-autumn-orange/30 text-autumn-orange hover:bg-autumn-orange hover:text-white transition-all rounded-full px-6"
            >
              Switch Role
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

