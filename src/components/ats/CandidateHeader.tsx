import { Bell, User } from 'lucide-react';
import { Button } from '../../components/ui/button';

interface CandidateHeaderProps {
    onLoginClick: () => void;
    onAboutClick: () => void;
    onHomeClick: () => void;
    onJobListingsClick: () => void;
    activePage?: string;
    isLoggedIn?: boolean;
    userProfile?: { name: string; avatar?: string };
    onLogout?: () => void;
}

export function CandidateHeader({
    onLoginClick,
    onAboutClick,
    onHomeClick,
    onJobListingsClick,
    activePage,
    isLoggedIn = false,
    userProfile,
    onLogout
}: CandidateHeaderProps) {
    return (
        <header className="bg-[#EAE3D2] border-b border-[#D6Ceb2] shadow-sm sticky top-0 z-50 font-sans">
            <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-8">
                {/* Logo */}
                <div
                    className="flex items-center cursor-pointer shrink-0"
                    onClick={onHomeClick}
                >
                    <span className="text-2xl font-bold text-[#D9534F] tracking-tight">Autum</span><span className="text-2xl font-bold text-[#2F5233] tracking-tight">hire</span>
                </div>

                {/* Header Search Bar */}
                <div className="flex-1 max-w-md hidden md:flex items-center gap-2">
                    <div className="relative w-full">
                        <input
                            type="text"
                            placeholder="Search jobs..."
                            className="w-full pl-4 pr-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#2F5233] text-sm"
                        />
                    </div>
                    <Button
                        variant="outline"
                        className="bg-transparent border-[#2F5233] text-[#2F5233] hover:bg-[#2F5233] hover:text-white px-6 transition-colors"
                    >
                        Search
                    </Button>
                </div>

                {/* Navigation & Actions */}
                <div className="flex items-center gap-6 shrink-0">
                    <nav className="hidden lg:flex items-center gap-6">
                        <button
                            onClick={onHomeClick}
                            className={`bg-transparent border-none cursor-pointer text-sm font-medium transition-colors ${activePage === 'dashboard' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-[#2F5233]'}`}
                        >
                            Home
                        </button>
                        <button
                            onClick={onJobListingsClick}
                            className={`bg-transparent border-none cursor-pointer text-sm font-medium transition-colors ${activePage === 'job-board' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-[#2F5233]'}`}
                        >
                            Job Listings
                        </button>
                        <button
                            onClick={onAboutClick}
                            className={`bg-transparent border-none cursor-pointer text-sm font-medium transition-colors ${activePage === 'about' ? 'text-gray-900 font-bold' : 'text-gray-600 hover:text-[#2F5233]'}`}
                        >
                            About us
                        </button>
                    </nav>

                    {isLoggedIn ? (
                        <div className="flex items-center gap-4">
                            <button className="bg-transparent border-none cursor-pointer text-gray-600 hover:text-[#2F5233] relative">
                                <Bell className="size-5" />
                                <span className="absolute -top-1 -right-1 size-2 bg-red-500 rounded-full"></span>
                            </button>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={onLogout} title="Sign out">
                                <div className="size-8 bg-[#2F5233] text-white rounded-full flex items-center justify-center font-medium shadow-sm">
                                    {userProfile?.name?.charAt(0) || <User className="size-4" />}
                                </div>
                                <div className="hidden sm:block leading-tight text-left">
                                    <p className="text-sm font-medium text-gray-800 truncate max-w-[140px]">{userProfile?.name}</p>
                                    <p className="text-[11px] text-gray-500">Candidate account</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={onLoginClick}
                            className="bg-transparent border-[#2F5233] text-[#2F5233] hover:bg-[#2F5233] hover:text-white px-6 transition-colors"
                        >
                            Log In
                        </Button>
                    )}
                </div>
            </div>
        </header>
    );
}

