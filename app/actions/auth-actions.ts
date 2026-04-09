// app/actions/auth-actions.ts
"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error)
    {
        console.error("Error signing out:", error);
        // Optionally, you could throw an error here to be caught by an error boundary
    }
    redirect("/login");
}