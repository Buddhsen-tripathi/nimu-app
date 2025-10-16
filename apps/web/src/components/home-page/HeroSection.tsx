"use client";

import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Play, Sparkles, Zap, Video } from "lucide-react";

interface HeroSectionProps {
  onOpenSignUp: () => void;
}

export default function HeroSection({ onOpenSignUp }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-white pt-20 pb-24 sm:pt-24 sm:pb-32">
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-8 inline-flex items-center rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-medium text-gray-900 shadow-sm"
          >
            <span className="mr-2 flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Now available: Nimu Beta 1.0
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl"
          >
            The better way to create
            <br />
            <span className="bg-gradient-to-r from-gray-900 via-gray-700 to-gray-900 bg-clip-text text-transparent">
              AI-powered videos
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600"
          >
            A fully customizable video generation platform for creators, businesses, and developers building the next generation of content.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <button
              onClick={onOpenSignUp}
              className="group inline-flex w-full items-center justify-center rounded-lg bg-gray-900 px-6 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md sm:w-auto"
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
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-300 bg-white px-6 py-3 text-base font-semibold text-gray-900 shadow-sm transition-all hover:bg-gray-50 hover:border-gray-400 sm:w-auto"
            >
              Sign up with email
              <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 sm:mt-20"
        >
          <div className="relative mx-auto max-w-6xl">
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
              <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex items-center space-x-2">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
              </div>
              
              <div className="relative bg-gradient-to-br from-gray-50 to-white p-8 lg:p-12">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8, duration: 0.5 }}
                    className="lg:col-span-2"
                  >
                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="mb-4 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900">Generate Video</h3>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                          <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Ready
                        </span>
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="mb-2 block text-xs font-medium text-gray-700">Your prompt</label>
                          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <p className="text-sm text-gray-600">
                              A serene mountain landscape at sunset with flowing rivers...
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="mb-2 block text-xs font-medium text-gray-700">Model</label>
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                              <p className="text-sm font-medium text-gray-900">Veo 3</p>
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-xs font-medium text-gray-700">Duration</label>
                            <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                              <p className="text-sm font-medium text-gray-900">5 seconds</p>
                            </div>
                          </div>
                        </div>

                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          className="flex w-full items-center justify-center rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800"
                        >
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Video
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>

                  <div className="space-y-4">
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.9, duration: 0.5 }}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Completed</p>
                            <p className="text-xs text-gray-500">2 min ago</p>
                          </div>
                        </div>
                      </div>
                      <div className="aspect-video rounded-lg bg-gradient-to-br from-purple-100 to-blue-100" />
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.0, duration: 0.5 }}
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <Zap className="h-5 w-5 text-blue-600" />
                            </motion.div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-900">Processing</p>
                            <p className="text-xs text-gray-500">45% complete</p>
                          </div>
                        </div>
                      </div>
                      <div className="aspect-video rounded-lg bg-gradient-to-br from-orange-100 to-pink-100" />
                    </motion.div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1, duration: 0.5 }}
                  className="mt-6 grid grid-cols-3 gap-4"
                >
                  {[
                    { icon: Video, label: "Multi-model", value: "3 providers" },
                    { icon: Zap, label: "Fast", value: "< 2 min" },
                    { icon: Sparkles, label: "Quality", value: "4K ready" },
                  ].map((stat, i) => (
                    <div key={i} className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
                      <stat.icon className="mx-auto mb-2 h-5 w-5 text-gray-400" />
                      <p className="text-xs font-medium text-gray-900">{stat.value}</p>
                      <p className="text-xs text-gray-500">{stat.label}</p>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-6 text-sm text-gray-500"
        >
          <div className="flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
            No credit card required
          </div> 
          <div className="flex items-center">
            <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-500" />
            Cancel anytime
          </div>
        </motion.div>
      </div>
    </section>
  );
}
