import { Button } from '@/components/ui/button'
import React from 'react'

const Page = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold underline">Hello world!</h1>
      <Button variant="destructive">Button</Button>
      <Button variant="secondary">Button</Button>
      <Button variant="link">Button</Button>
      <Button variant="ghost">Button</Button>
      <Button>Button</Button>
    </div>
  )
}

export default Page