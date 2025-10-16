"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Star } from "lucide-react";

interface CTASectionProps {
  onOpenSignUp: () => void;
}

export default function CTASection({ onOpenSignUp }: CTASectionProps) {
  return (
    <section className="relative overflow-hidden bg-gray-50 py-20 sm:py-28">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 shadow-2xl">
          <div className="relative px-6 py-20 sm:px-16 sm:py-24">
            <div
              className="absolute left-0 top-0 -z-10 h-full w-full opacity-20"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                               radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)`,
              }}
            />

            <div className="mx-auto max-w-2xl text-center">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl"
              >
                Ready to start creating?
              </motion.h2>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-300"
              >
                Join thousands of creators, businesses, and developers who trust Nimu to bring their ideas to life with AI-powered video generation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                viewport={{ once: true }}
                className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
              >
                <button
                  onClick={onOpenSignUp}
                  className="group inline-flex w-full items-center justify-center rounded-lg bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-lg transition-all hover:bg-gray-50 hover:shadow-xl sm:w-auto"
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign up with Google
                </button>
                <button
                  onClick={onOpenSignUp}
                  className="inline-flex w-full items-center justify-center rounded-lg border-2 border-white/20 bg-transparent px-6 py-3 text-base font-semibold text-white transition-all hover:border-white/40 hover:bg-white/10 sm:w-auto"
                >
                  Sign up with email
                  <ArrowRight className="ml-2 h-4 w-4" />
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                viewport={{ once: true }}
                className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-gray-300"
              >
                <div className="flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                  No credit card required
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                  Free forever plan
                </div>
                <div className="flex items-center">
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-400" />
                  Cancel anytime
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          viewport={{ once: true }}
          className="mt-16"
        >
          <p className="mb-8 text-center text-sm font-semibold text-gray-600">
            Trusted by creators worldwide
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { name: "Sarah K.", role: "Content Creator", rating: 5, text: "Game changer for my workflow" },
              { name: "Mike R.", role: "Marketing Director", rating: 5, text: "Saves hours of production time" },
              { name: "Emma L.", role: "YouTuber", rating: 5, text: "Quality is outstanding" },
              { name: "David P.", role: "Developer", rating: 5, text: "API integration is seamless" },
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
                viewport={{ once: true }}
                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="mb-4 text-sm text-gray-600">&quot;{testimonial.text}&quot;</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{testimonial.name}</p>
                  <p className="text-xs text-gray-500">{testimonial.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
