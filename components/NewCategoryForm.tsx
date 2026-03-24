"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { CheckCircle2, ImageIcon } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";
import { Button } from '@/components/ui/button';
import { createCategory } from "@/app/actions/category-actions";
import { useState, useTransition } from "react";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { toast } from "sonner";
import { categorySchema, CategoryFormValues } from "@/types/category";

// 1. Define the Schema



// ... (Imports for shadcn components: Form, FormControl, etc.)

export default function AddCategoryForm() {
    const [isPending, startTransition] = useTransition();

    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categorySchema),
        defaultValues: {
            name: "",
            description: "",
            icon: "Briefcase",
            color: "#1D3557",
            image: "", // We'll store the Public ID here
        },
        mode: "onBlur",
    });

    async function onSubmit(data: CategoryFormValues) {
        startTransition(async () => {
            // We pass the validated values directly to our Server Action
            try
            {
                await createCategory(data);
                toast.success("Category created successfully!");
                form.reset(); // Clear the form for the next one
            } catch (error)
            {
                toast.error("Something went wrong. Please try again.");
            }
        });
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">

                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Category Name</FormLabel>
                            <FormControl><Input placeholder="e.g. Degree Level" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* ... (Other shadcn fields for Description, Icon, Color) ... */}

                <FormField
                    control={form.control}
                    name="image"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="font-bold">Category Banner</FormLabel>
                            <FormControl>
                                <CldUploadWidget
                                    uploadPreset="kpsc_preset"
                                    onSuccess={(result: any) => {
                                        // This is the "Pro" move: Manually setting the form value
                                        form.setValue("image", result?.info?.public_id);
                                    }}
                                >
                                    {({ open }) => (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full h-32 border-dashed border-2 flex-col gap-2"
                                            onClick={() => open()}
                                        >
                                            {field.value ? (
                                                <span className="text-emerald-600 font-bold flex items-center gap-2">
                                                    <CheckCircle2 size={18} /> Image Uploaded
                                                </span>
                                            ) : (
                                                <>
                                                    <ImageIcon className="text-slate-400" />
                                                    <span>Upload Banner Image</span>
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </CldUploadWidget>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full bg-slate-900 h-12" disabled={isPending}>
                    {isPending ? "Creating Category..." : "Create Category"}
                </Button>
            </form>
        </Form>
    );
}