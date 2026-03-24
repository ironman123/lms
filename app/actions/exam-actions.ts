'use server';
import { revalidatePath } from 'next/cache';

export async function createExam(data: any) {
    // 1. Save to Database
    console.log(data);
    // 2. Refresh the UI
    revalidatePath('/library/category/[id]');

    return { success: true };
}