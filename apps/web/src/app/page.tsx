"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SignUpModal from "@/components/auth/SignUpModal";
import LoginModal from "@/components/auth/LoginModal";
import Navbar from "@/components/home-page/Navbar";
import HeroSection from "@/components/home-page/HeroSection";
import FeaturesSection from "@/components/home-page/Features";
import CTASection from "@/components/home-page/CTA";
import Footer from "@/components/home-page/Footer";

function PageContent() {
  const [isSignUpOpen, setIsSignUpOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
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
    <>
      <Navbar onOpenSignUp={handleOpenSignUp} onOpenLogin={handleOpenLogin} />
      <HeroSection onOpenSignUp={handleOpenSignUp} />
      <FeaturesSection />
      <CTASection onOpenSignUp={handleOpenSignUp} />
      <Footer />

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
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <PageContent />
    </Suspense>
  );
}
