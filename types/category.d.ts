import { z } from "zod";
const categorySchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    description: z.string().min(10, "Description is a bit too short"),
    icon: z.string().min(1, "Please select an icon name (e.g., Briefcase)"),
    color: z.string().default("#1D3557"),
    image: z.string().min(5, "Please use a valid image url").default("adnan-saifee-zmr9TeA7WjU-unsplash_jpxf7l"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;