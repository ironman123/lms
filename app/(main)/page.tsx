import Cta from '@/components/Cta'
import List from '@/components/List'
import ExamCard from '@/components/ExamCard'
import { Button } from '@/components/ui/button'
import React from 'react'
import { exams } from '@/constants/index' // Assuming your papers are currently stored here
import ExamCategoryCard from '@/components/ExamCategoryCard'
import Exam from './library/exam/page'
import { KPSC_CATEGORIES } from '@/constants/index'
import HeroSection from '@/components/Hero'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const Page = () => {
  return (
    <main className="w-full">
      <HeroSection
        title="Prepare for Your Dream Job"
        subtitle="Access thousands of practice questions and mock tests for various government exams."
        backgroundImage="/images/trison-thomas-aZcRBBwfglE-unsplash.jpg"
      />

      {/* 🔥 FIX: Added a wide, centered wrapper for all content below the hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">

        {/* CATEGORIES SECTION */}
        <section>
          {/* 🔥 FIX: Grouped the heading properly above the grid */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Exam Categories</h1>
            <Link href="/library/category" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group">
              Explore all categories <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
            {KPSC_CATEGORIES.map((category) => (
              <ExamCategoryCard
                key={category.id}
                id={category.id}
                name={category.name}
                slug={category.slug}
                description={category.description}
                icon={category.icon}
                image={category.image}
                color={category.color}
              />
            ))}
          </div>
        </section>

        {/* POPULAR PAPERS SECTION */}
        <section>
          <div className="mb-8 flex items-center justify-between">
            {/* 🔥 FIX: Changed title to Popular Papers */}
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Popular Papers</h1>
            <Link href="/library/paper" className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors group">
              Browse all papers <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8'>
            {exams.slice(0, 3).map((paper) => (
              <ExamCard
                key={paper.$id}
                id={paper.$id}
                name={paper.name}
                description={paper.description}
                tags={paper.tags}
                duration={paper.duration}
                totalMarks={paper.totalMarks}
                color={paper.color}
              />
            ))}
          </div>
        </section>

        {/* BOTTOM SECTION */}
        {/* <section className='space-y-16'>
          <List
            title="Recently Viewed"
            exams={exams} // Update this to your papers variable if you have one
            className="w-full" // 🔥 FIX: Let the list take full width of the container
          />
          <Cta />
        </section> */}

      </div>
    </main>
  )
}

export default Page