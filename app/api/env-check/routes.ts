export async function GET() {
    return Response.json({
        // Check for specific keys
        hasGemini: !!process.env.GEMINI_API_KEY,
        hasDatabase: !!process.env.DATABASE_URL,
        hasCloudinary: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        // Check the current working directory (where Node thinks it is)
        cwd: process.cwd(),
        // List all keys that contain "NEXT_PUBLIC"
        publicKeys: Object.keys(process.env).filter(k => k.startsWith("NEXT_PUBLIC"))
    });
}