import Link from 'next/link';

export const Header = () => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-2">
             <div className="w-10 h-10 bg-purple-700 rounded-lg flex items-center justify-center text-white font-bold">S</div>
             <span className="text-xl font-bold text-[#2D1B69]">Saphala Self Prep</span>
          </Link>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <Link href="/" className="text-gray-600 hover:text-[#2D1B69] font-medium">Home</Link>
          <Link href="/courses" className="text-gray-600 hover:text-[#2D1B69] font-medium">Courses</Link>
          <Link href="/products" className="text-gray-600 hover:text-[#2D1B69] font-medium">Products</Link>
        </nav>

        <div className="flex items-center gap-4">
          <Link href="/login" className="text-[#2D1B69] font-medium hover:underline">Log In</Link>
          <button className="btn-glossy-primary text-sm px-6 py-2">Create Account</button>
        </div>
      </div>
    </header>
  );
};
