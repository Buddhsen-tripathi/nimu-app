'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Menu, X, ChevronDown } from 'lucide-react';

interface NavbarProps {
  onOpenSignUp: () => void;
  onOpenLogin: () => void;
}

export default function Navbar({ onOpenSignUp, onOpenLogin }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Product', href: '#' },
    { name: 'Enterprise', href: '#' },
    { name: 'Pricing', href: '#' },
    { name: 'Resources', href: '#' },
  ];

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b transition-colors duration-200 ${
      isScrolled 
        ? 'border-neutral-200 bg-white/80 backdrop-blur-xl' 
        : 'border-transparent bg-white'
    }`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-black">
                <span className="text-base font-bold text-white">N</span>
              </div>
              <span className="text-xl font-semibold text-neutral-900">
                Nimu
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden items-center space-x-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="inline-flex items-center rounded-md px-3 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                {link.name}
                {['Product', 'Resources'].includes(link.name) && (
                  <ChevronDown className="ml-1 h-4 w-4" />
                )}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden items-center space-x-3 md:flex">
            <button
              onClick={onOpenLogin}
              className="rounded-md px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
            >
              Log in
            </button>
            <button
              onClick={onOpenSignUp}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
            >
              Get started
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-md p-2 text-neutral-700 transition-colors hover:bg-neutral-100 md:hidden"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-neutral-200 py-4 md:hidden"
          >
            <div className="space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.name}
                </Link>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-neutral-200 pt-4">
              <button
                onClick={() => {
                  onOpenLogin();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-base font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                Log in
              </button>
              <button
                onClick={() => {
                  onOpenSignUp();
                  setIsMobileMenuOpen(false);
                }}
                className="block w-full rounded-md bg-black px-3 py-2 text-left text-base font-medium text-white transition-colors hover:bg-neutral-800"
              >
                Get started
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}