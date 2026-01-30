'use client';
import { useState } from 'react';
import { Header } from '@/ui-core/Header';
import { Footer } from '@/ui-core/Footer';
import { courses } from '@/config/courses';

export default function CoursesPage() {
  const [filter, setFilter] = useState({ exam: 'All', subject: 'All', category: 'All' });

  const filteredCourses = courses.filter(course => {
    return (filter.exam === 'All' || course.exam === filter.exam) &&
           (filter.subject === 'All' || course.subject === filter.subject) &&
           (filter.category === 'All' || course.category === filter.category);
  });

  const exams = ['All', ...Array.from(new Set(courses.map(c => c.exam)))];
  const subjects = ['All', ...Array.from(new Set(courses.map(c => c.subject)))];
  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category)))];

  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <div className="bg-gray-50 py-12 flex-grow">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl font-bold text-[#2D1B69] mb-8">Course Catalog</h1>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-800 mb-4 text-sm uppercase tracking-wider">Filters</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Exam Type</label>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    value={filter.exam}
                    onChange={(e) => setFilter({...filter, exam: e.target.value})}
                  >
                    {exams.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    value={filter.subject}
                    onChange={(e) => setFilter({...filter, subject: e.target.value})}
                  >
                    {subjects.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <select 
                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    value={filter.category}
                    onChange={(e) => setFilter({...filter, category: e.target.value})}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="md:col-span-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredCourses.map(course => (
                  <div key={course.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group overflow-hidden">
                    <div className="aspect-video relative overflow-hidden">
                      <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <span className="absolute top-4 left-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                        {course.category}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="text-xs text-purple-600 font-medium mb-1">{course.exam}</p>
                      <h3 className="font-bold text-[#2D1B69] line-clamp-2 mb-4">{course.title}</h3>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-gray-900">{course.price}</span>
                        <button className="text-purple-600 font-semibold text-sm hover:underline">View Details →</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {filteredCourses.length === 0 && (
                <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                  <p className="text-gray-500">No courses found matching your filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </main>
  );
}
