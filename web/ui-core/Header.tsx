'use client';
import Link from 'next/link';
import { useState } from 'react';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleCreateAccountClick = () => {
    setIsMenuOpen(false);
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Header] Create Account clicked, navigating to /register');
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 relative">
        {/* Left: Logo */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center text-white font-bold">S</div>
            <span className="text-xl font-bold text-[#2D1B69] hidden sm:inline">Saphala Self Prep</span>
          </Link>
        </div>
        
        {/* Center: Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-10 absolute left-1/2 -translate-x-1/2 pointer-events-none">
          <Link href="/" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors pointer-events-auto">Home</Link>
          <Link href="/courses" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors pointer-events-auto">Courses</Link>
          <Link href="/products" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors pointer-events-auto">Products</Link>
          <Link href="/about" className="hidden lg:inline text-gray-600 hover:text-[#2D1B69] font-medium transition-colors pointer-events-auto">About</Link>
          <Link href="/contact" className="hidden xl:inline text-gray-600 hover:text-[#2D1B69] font-medium transition-colors pointer-events-auto">Contact</Link>
        </nav>

        {/* Right: Buttons + Hamburger */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 relative z-10">
          <div className="hidden sm:flex items-center gap-3 md:gap-4">
            <Link href="/login" className="btn-glossy-secondary text-sm px-4 lg:px-6 py-2 whitespace-nowrap">Log In</Link>
            <Link href="/register" onClick={handleCreateAccountClick} className="btn-glossy-primary text-sm px-4 lg:px-6 py-2 whitespace-nowrap">Create Account</Link>
          </div>
          
          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-[#2D1B69]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-6 px-4 absolute w-full shadow-lg z-40">
          <nav className="flex flex-col gap-4 mb-8">
            <Link href="/" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium py-2">Home</Link>
            <Link href="/courses" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium py-2">Courses</Link>
            <Link href="/products" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium py-2">Products</Link>
            <Link href="/about" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium py-2">About</Link>
            <Link href="/contact" onClick={() => setIsMenuOpen(false)} className="text-gray-600 font-medium py-2">Contact</Link>
          </nav>
          <div className="flex flex-col gap-4 sm:hidden">
            <Link href="/login" onClick={() => setIsMenuOpen(false)} className="btn-glossy-secondary text-center py-3">Log In</Link>
            <Link href="/register" onClick={handleCreateAccountClick} className="btn-glossy-primary w-full py-3 text-center">Create Account</Link>
          </div>
        </div>
      )}
    </header>
  );
};
