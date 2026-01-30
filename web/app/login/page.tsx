'use client';
import Link from 'next/link';
import { Header } from '@/ui-core/Header';
import { Footer } from '@/ui-core/Footer';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col bg-purple-50/50">
      <Header />
      <div className="flex-grow flex items-center justify-center py-20 px-4">
        <div className="bg-white p-8 md:p-12 rounded-2xl shadow-xl border border-purple-100 w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-[#2D1B69] mb-2">Welcome Back</h1>
            <p className="text-gray-500">Log in to your Saphala account</p>
          </div>
          
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                placeholder="email@example.com"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <Link href="#" className="text-xs text-purple-600 hover:underline">Forgot password?</Link>
              </div>
              <input 
                type="password" 
                placeholder="••••••••"
                className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
              />
            </div>
            <button 
              type="submit"
              className="btn-glossy-primary w-full py-4 mt-2"
            >
              Log In
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center">
            <p className="text-gray-600 text-sm">
              Don&apos;t have an account?{' '}
              <Link href="#" className="text-purple-600 font-bold hover:underline">Create Account</Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
