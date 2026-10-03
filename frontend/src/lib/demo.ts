// Demo shortcuts (one-click demo sign-in, "reset sample data") are shown only when NEXT_PUBLIC_DEMO_MODE=true.
// On in development via .env.development; off in production builds unless the deployment sets it.
export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
