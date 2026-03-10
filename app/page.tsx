import Cta from '@/components/Cta'

import List from '@/components/List'
import ExamCard from '@/components/ExamCard'
import { Button } from '@/components/ui/button'
import React from 'react'
import { exams } from '@/constants/index'

const Page = () => {
  return (
    <main>
      <h1>Popular Exams</h1>
      <section className='home-section grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {
          exams.slice(0, 3).map((exam) => (
            <ExamCard
              key={exam.$id}
              id={exam.$id}
              name={exam.name}
              description={exam.description}
              tags={exam.tags}
              duration={exam.duration}
              totalMarks={exam.totalMarks}
              color={exam.color}
            />
          ))
        }


      </section>

      <section className='home-section'>
        <List
          title="Recently Viewed"
          exams={exams}
          className="w-2/3 max-lg:w-full"
        />
        <Cta />
      </section>
    </main>
  )
}

export default Page