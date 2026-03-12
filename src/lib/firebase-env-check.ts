export function checkFirebaseEnv() {
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(
      `Missing Firebase env vars: ${missing.join(", ")}. ` +
        "Create a .env.local file with your Firebase config."
    );
    return false;
  }
  return true;
}
