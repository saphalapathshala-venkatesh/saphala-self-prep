'use client';
import { useState } from 'react';
import { featuredCourses } from '../config/featuredCourses';

export const CourseCarousel = () => {
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 5;

  const next = () => {
    if (startIndex + visibleCount < featuredCourses.length) {
      setStartIndex(prev => prev + 1);
    }
  };

  const prev = () => {
    if (startIndex > 0) {
      setStartIndex(prev => prev - 1);
    }
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-bold text-[#2D1B69] mb-4">Featured Courses</h2>
            <p className="text-gray-600">Hand-picked courses for your success</p>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={prev}
              disabled={startIndex === 0}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
            >
              ←
            </button>
            <button 
              onClick={next}
              disabled={startIndex + visibleCount >= featuredCourses.length}
              className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 disabled:opacity-30"
            >
              →
            </button>
          </div>
        </div>

        <div className="flex gap-6 overflow-hidden">
          {featuredCourses.slice(startIndex, startIndex + visibleCount).map((course) => (
            <div key={course.id} className="min-w-[calc(20%-1.2rem)] bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="aspect-video relative overflow-hidden rounded-t-xl">
                <img src={course.image} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <span className="absolute top-4 left-4 bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                  {course.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-[#2D1B69] line-clamp-2">{course.title}</h3>
                <button className="mt-4 text-purple-600 font-semibold text-sm hover:underline">Learn More →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
