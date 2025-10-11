"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import SignUpModal from "@/components/auth/SignUpModal";
import LoginModal from "@/components/auth/LoginModal";

function PageContent() {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if auth query parameter is present to auto-open login modal
    const authParam = searchParams.get("auth");
    if (authParam === "login") {
      setIsLoginOpen(true);
    }
  }, [searchParams]);

  const handleOpenSignUp = () => {
    setIsLoginOpen(false);
    setIsSignUpOpen(true);
  };

  const handleOpenLogin = () => {
    setIsSignUpOpen(false);
    setIsLoginOpen(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Nimu</h1>
        <p className="text-lg text-muted-foreground mb-8">
          Your AI-powered video and audio generation platform
        </p>
        <div className="space-x-4">
          <Button onClick={handleOpenLogin} variant="default" size="default">
            Sign In
          </Button>
          <Button onClick={handleOpenSignUp} variant="outline" size="default">
            Sign Up
          </Button>
        </div>
      </div>

      <SignUpModal
        open={isSignUpOpen}
        onOpenChange={setIsSignUpOpen}
        onSwitchToLogin={handleOpenLogin}
      />

      <LoginModal
        open={isLoginOpen}
        onOpenChange={setIsLoginOpen}
        onSwitchToSignUp={handleOpenSignUp}
      />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Welcome to Nimu</h1>
            <p className="text-lg text-muted-foreground mb-8">
              Your AI-powered video and audio generation platform
            </p>
            <div className="space-x-4">
              <Button variant="default" size="default" disabled>
                Sign In
              </Button>
              <Button variant="outline" size="default" disabled>
                Sign Up
              </Button>
            </div>
          </div>
        </div>
      }
    >
      <PageContent />
    </Suspense>
  );
}
