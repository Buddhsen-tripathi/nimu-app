"use client";

import { ReactNode } from "react";
import { authClient } from "@/lib/auth-client";

interface SessionProviderProps {
  children: ReactNode;
}

export default function SessionProvider({ children }: SessionProviderProps) {
  // The authClient.useSession() hook is automatically available throughout the app
  // when the authClient is imported. Better Auth uses nanostore internally
  // to manage session state globally.

  return <>{children}</>;
}
