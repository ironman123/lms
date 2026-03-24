import { z } from "zod";
export const categorySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(10, "Description is a bit too short"),
    icon: z.string().min(1, "Please select an icon name (e.g., Briefcase)"),
    color: z.string().default("#1D3557"),
    image: z.string().optional().transform((val) =>
        (!val || val === "")
            ? "adnan-saifee-zmr9TeA7WjU-unsplash_jpxf7l"
            : val
    ),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;