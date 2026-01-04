export default function handler(request, response) {
    // Configured to be a no-op success for Vercel deployment
    // Data persistence is primarily client-side (localStorage) for this version.
    response.status(200).json({
        success: true,
        message: "Results received (Client-side persistence only for this build)",
        timestamp: new Date().toISOString()
    });
}
