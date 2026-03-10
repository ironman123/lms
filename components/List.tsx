import {
    Table,
    TableBody,
    TableCell,
    TableHeader,
    TableHead,
    TableRow,
} from "@/components/ui/table"

import { cn } from "@/lib/utils"
import Link from "next/link"
import Image from "next/image"

import { Exams } from "@/types/index"

interface ListProps {
    title: string
    exams?: Exams[];
    className?: string
}

const List = ({ title, exams, className }: ListProps) => {
    return (
        <article className={cn('recent-list', className)}>
            <h2 className="font-bold text-3xl mb-6">{title}</h2>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="text-lg w-1/3">Exam</TableHead>
                        <TableHead className="text-lg w-2/3">Description</TableHead>
                        <TableHead className="text-lg">Year</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {exams?.map(({ $id, name, description, year }) => (
                        <TableRow key={$id}>
                            <TableCell>
                                <Link href={`library/exam/${name}-page`} className="font-medium">
                                    < div className="flex items-center gap-2">
                                        <div className="size-[45px] flex items-center justify-center rounded-lg max-md:hidden"
                                            style={{ backgroundColor: "#FFDA6E" }}>
                                            <Image
                                                src={`/icons/cap.svg`}
                                                alt={name}
                                                width={30}
                                                height={30} />
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <p className="font-bold text-lg">
                                                {name}
                                            </p>
                                        </div>
                                    </div>
                                </Link>
                            </TableCell>
                            <TableCell className="flex font-medium gap-2">
                                <div className="flex shrink-0  w-10 h-10 items-center justify-center rounded-lg p-2 md:hidden"
                                    style={{ backgroundColor: "#FFDA6E" }}>
                                    <Image
                                        src={`/icons/cap.svg`}
                                        alt={name}
                                        width={18}
                                        height={18} />
                                </div>
                                <div className="w-fit">
                                    {description}
                                </div>
                            </TableCell>
                            <TableCell className="font-medium">
                                <div className="tag-badge">
                                    {year}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </article>
    )
}

export default List