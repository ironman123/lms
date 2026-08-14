import Link from "next/link";
import { Bookmark } from "lucide-react";
import { getQuestionBookmarks } from "@/app/(main)/actions/bookmark-actions";

export default async function BookmarksPage() {
    const bookmarks = await getQuestionBookmarks();
    return <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6"><div className="flex items-center gap-3"><Bookmark className="text-primary" /><div><h1 className="text-3xl font-black">Saved questions</h1><p className="mt-1 text-sm text-muted-foreground">Questions you saved to revisit outside a specific attempt.</p></div></div>
        {bookmarks.length === 0 ? <div className="mt-8 rounded-3xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">No saved questions yet. Bookmark a question while practising to find it here.</div> : <div className="mt-8 space-y-3">{bookmarks.map((bookmark) => <article key={bookmark.id} className="rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary">{bookmark.question.type}</span>{bookmark.question.paper && <Link className="text-xs font-bold text-primary hover:underline" href={`/library/paper/${bookmark.question.paper.id}`}>{bookmark.question.paper.title}</Link>}</div><p className="mt-3 text-sm font-semibold leading-relaxed">{bookmark.question.content}</p></article>)}</div>}
    </main>;
}
