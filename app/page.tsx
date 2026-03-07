import ExamCard from '@/components/ExamCard'
import { Button } from '@/components/ui/button'
import React from 'react'

const Page = () => {
  return (
    <main>
      <h1>Popular Exams</h1>
      <section className='home-section'>
        <ExamCard
          id="123"
          name="JEE Mains"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate."
          tags={["Engineering", "National Level"]}
          duration="3 hours"
          totalMarks={300}
          color="#FFDA6E"
        />
        <ExamCard
          id="456"
          name="NEET"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate."
          tags={["Medical", "National Level"]}
          duration="3 hours"
          totalMarks={720}
          color="#e5d0ff"
        />
        <ExamCard
          id="789"
          name="GATE"
          description="Lorem ipsum dolor sit amet consectetur adipisicing elit. Voluptas, voluptate."
          tags={["Engineering", "National Level"]}
          duration="3 hours"
          totalMarks={1000}
          color="#BDE7FF"
        />
      </section>
    </main>
  )
}

export default Page