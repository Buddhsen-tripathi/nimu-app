"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ChevronDown } from "lucide-react";

interface NavbarProps {
  onOpenSignUp: () => void;
  onOpenLogin: () => void;
}

export default function Navbar({ onOpenSignUp, onOpenLogin }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const productDropdown = [
    { name: "Video Generation", href: "#" },
    { name: "Audio Synthesis", href: "#" },
    { name: "Style Transfer", href: "#" },
    { name: "Templates", href: "#" },
  ];

  const resourcesDropdown = [
    { name: "Documentation", href: "#" },
    { name: "Blog", href: "#" },
    { name: "Community", href: "#" },
    { name: "Help Center", href: "#" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled
          ? "border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm"
          : "border-b border-transparent bg-white"
      }`}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <Image
                src="/logo.png"
                alt="Nimu Logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-xl font-bold text-gray-900">Nimu</span>
            </Link>
          </div>

          <div className="hidden items-center space-x-1 md:flex">
            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("product")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900">
                Product
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <AnimatePresence>
                {activeDropdown === "product" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
                  >
                    {productDropdown.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link
              href="#"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Enterprise
            </Link>
            <Link
              href="#"
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Pricing
            </Link>

            <div
              className="relative"
              onMouseEnter={() => setActiveDropdown("resources")}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900">
                Resources
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>
              <AnimatePresence>
                {activeDropdown === "resources" && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 mt-2 w-56 rounded-xl border border-gray-200 bg-white py-2 shadow-lg"
                  >
                    {resourcesDropdown.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        className="block px-4 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden items-center space-x-3 md:flex">
            <button
              onClick={onOpenLogin}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Log in
            </button>
            <button
              onClick={onOpenSignUp}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md"
            >
              Get started
            </button>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-gray-200 py-4 md:hidden"
            >
              <div className="space-y-1">
                <Link
                  href="#"
                  className="block rounded-lg px-4 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Product
                </Link>
                <Link
                  href="#"
                  className="block rounded-lg px-4 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Enterprise
                </Link>
                <Link
                  href="#"
                  className="block rounded-lg px-4 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pricing
                </Link>
                <Link
                  href="#"
                  className="block rounded-lg px-4 py-2 text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Resources
                </Link>
              </div>
              <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
                <button
                  onClick={() => {
                    onOpenLogin();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full rounded-lg px-4 py-2 text-left text-base font-medium text-gray-700 transition-colors hover:bg-gray-100"
                >
                  Log in
                </button>
                <button
                  onClick={() => {
                    onOpenSignUp();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full rounded-lg bg-gray-900 px-4 py-2 text-left text-base font-medium text-white transition-colors hover:bg-gray-800"
                >
                  Get started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
