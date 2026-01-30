import Link from 'next/link';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center gap-2">
             <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center text-white font-bold">S</div>
             <span className="text-xl font-bold text-[#2D1B69]">Saphala Self Prep</span>
          </Link>
        </div>
        
        <nav className="hidden lg:flex items-center gap-10">
          <Link href="/" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors">Home</Link>
          <Link href="/courses" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors">Courses</Link>
          <Link href="/products" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors">Products</Link>
          <Link href="/about" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors">About</Link>
          <Link href="/contact" className="text-gray-600 hover:text-[#2D1B69] font-medium transition-colors">Contact</Link>
        </nav>

        <div className="flex items-center gap-3 md:gap-4 flex-shrink-0">
          <Link href="/login" className="btn-glossy-secondary text-sm px-5 py-2 whitespace-nowrap">Log In</Link>
          <button className="btn-glossy-primary text-sm px-5 py-2 whitespace-nowrap">Create Account</button>
        </div>
      </div>
    </header>
  );
};
