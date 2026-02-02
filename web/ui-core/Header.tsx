'use client';
import Link from 'next/link';
import { useState } from 'react';

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const closeMenu = () => setIsMenuOpen(false);

  const handleCreateAccountClick = () => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[Header] Create Account clicked');
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-[100]">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4 relative">
        {/* Left: Logo */}
        <div className="flex-shrink-0 relative z-10">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center text-white font-bold">
              S
            </div>
            <span className="text-xl font-bold text-[#2D1B69] hidden sm:inline">
              Saphala Self Prep
            </span>
          </Link>
        </div>

        {/* Center: Desktop Nav */}
        <nav
          className="hidden md:flex items-center gap-6 lg:gap-10 absolute left-1/2 -translate-x-1/2 w-max max-w-[55%] overflow-hidden z-0"
          aria-label="Primary navigation"
        >
          <Link
            href="/"
            className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors whitespace-nowrap"
          >
            Home
          </Link>
          <Link
            href="/courses"
            className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors whitespace-nowrap"
          >
            Courses
          </Link>
          <Link
            href="/products"
            className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors whitespace-nowrap"
          >
            Products
          </Link>
          <Link
            href="/about"
            className="hidden lg:inline text-gray-600 hover:text-[#2D1B69] font-medium transition-colors whitespace-nowrap"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="hidden xl:inline text-gray-600 hover:text-[#2D1B69] font-medium transition-colors whitespace-nowrap"
          >
            Contact
          </Link>
        </nav>

        {/* Right: Buttons + Hamburger */}
        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0 relative z-20 pointer-events-auto">
          <div className="hidden sm:flex items-center gap-3 md:gap-4">
            <Link
              href="/login"
              className="btn-glossy-secondary text-sm px-4 lg:px-6 py-2 whitespace-nowrap"
            >
              Log In
            </Link>
            <Link href="/register" legacyBehavior>
              <a
                onClick={handleCreateAccountClick}
                className="btn-glossy-primary text-sm px-4 lg:px-6 py-2 whitespace-nowrap cursor-pointer"
              >
                Create Account
              </a>
            </Link>
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="md:hidden p-2 text-[#2D1B69]"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            type="button"
          >
            {isMenuOpen ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay - ONLY rendered when menu is open */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 py-6 px-4 absolute w-full shadow-lg z-[90]">
          <nav className="flex flex-col gap-4 mb-8">
            <Link href="/" onClick={closeMenu} className="text-gray-600 font-medium py-2">
              Home
            </Link>
            <Link href="/courses" onClick={closeMenu} className="text-gray-600 font-medium py-2">
              Courses
            </Link>
            <Link href="/products" onClick={closeMenu} className="text-gray-600 font-medium py-2">
              Products
            </Link>
            <Link href="/about" onClick={closeMenu} className="text-gray-600 font-medium py-2">
              About
            </Link>
            <Link href="/contact" onClick={closeMenu} className="text-gray-600 font-medium py-2">
              Contact
            </Link>
          </nav>

          <div className="flex flex-col gap-4 sm:hidden">
            <Link
              href="/login"
              onClick={closeMenu}
              className="btn-glossy-secondary text-center py-3"
            >
              Log In
            </Link>
            <Link href="/register" legacyBehavior>
              <a
                onClick={() => {
                  closeMenu();
                  handleCreateAccountClick();
                }}
                className="btn-glossy-primary w-full py-3 text-center cursor-pointer"
              >
                Create Account
              </a>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
