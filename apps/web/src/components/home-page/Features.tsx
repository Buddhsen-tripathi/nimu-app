"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Calendar,
  Clock,
  Globe,
  Link2,
  Settings,
  Shield,
  Sparkles,
  Users,
  Video,
  Zap,
  CheckCircle2,
  Play,
} from "lucide-react";

export default function FeaturesSection() {
  return (
    <>
      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-base font-semibold leading-7 text-gray-600">
              How it works
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Three simple steps to create
            </p>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-6 sm:mt-20 lg:max-w-none lg:grid-cols-3">
            {[
              {
                number: "1",
                title: "Connect your prompt",
                description: "Simply describe what you want to create. Our AI understands your vision and prepares the generation.",
              },
              {
                number: "2",
                title: "Set your preferences",
                description: "Choose your AI model, aspect ratio, duration, and other creative parameters that match your needs.",
              },
              {
                number: "3",
                title: "Generate your video",
                description: "Let our AI bring your vision to life. Download, share, or iterate with new variations.",
              },
            ].map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="group relative rounded-xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-900 transition-colors group-hover:border-gray-300 group-hover:bg-gray-100">
                  <span className="text-xl font-bold">{step.number}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-600">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-gray-200 bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-base font-semibold leading-7 text-gray-600">
              Features
            </h2>
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Your all-purpose video studio
            </p>
          </motion.div>

          <div className="mx-auto mt-16 space-y-8 sm:mt-20">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 lg:p-12">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <Clock className="h-5 w-5 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Avoid creative burnout
                  </h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    Set your creative boundaries with generation limits, cooldown periods, and quality controls.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Minimum notice period before generations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Buffer time between video generations</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Custom generation intervals and limits</span>
                    </li>
                  </ul>
                </div>
                <div className="border-t border-gray-200 bg-gray-50 p-8 lg:border-l lg:border-t-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="w-full max-w-sm space-y-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Daily limit</span>
                        <span className="font-semibold text-gray-900">10 videos</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Buffer time</span>
                        <span className="font-semibold text-gray-900">5 minutes</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Notice period</span>
                        <span className="font-semibold text-gray-900">30 minutes</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="order-2 border-t border-gray-200 bg-gray-50 p-8 lg:order-1 lg:border-r lg:border-t-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm">
                      <div className="mb-3 text-sm text-gray-600">Your custom link</div>
                      <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                        <Link2 className="mr-2 h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          <span className="text-gray-500">nimu.app/</span>
                          <span className="font-semibold text-gray-900">yourname</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="order-1 p-8 lg:order-2 lg:p-12">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <Link2 className="h-5 w-5 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Stand out with custom branding
                  </h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    Personalize your creative space with custom branding and share your unique workspace URL.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Custom branded workspace</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Personalized URL</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Professional portfolio page</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="p-8 lg:p-12">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <Users className="h-5 w-5 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Streamline your workflow
                  </h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    Organize projects with collections, collaborate with team members, and manage versions effortlessly.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Project organization and collections</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Team collaboration tools</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Version control and history</span>
                    </li>
                  </ul>
                </div>
                <div className="border-t border-gray-200 bg-gray-50 p-8 lg:border-l lg:border-t-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="w-full max-w-sm space-y-2">
                      {["Project Alpha", "Marketing Campaign", "Product Demo"].map((project, i) => (
                        <div key={i} className="flex items-center rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                          <div className="mr-3 h-10 w-10 rounded-lg bg-gray-100" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{project}</div>
                            <div className="text-xs text-gray-500">{3 - i} videos</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              viewport={{ once: true }}
              className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2">
                <div className="order-2 border-t border-gray-200 bg-gray-50 p-8 lg:order-1 lg:border-r lg:border-t-0">
                  <div className="flex h-full items-center justify-center">
                    <div className="w-full max-w-sm space-y-3">
                      {[
                        { time: "Now", text: "Your video is ready!", icon: CheckCircle2 },
                        { time: "2 min ago", text: "Video processing started", icon: Play },
                        { time: "5 min ago", text: "Generation queued", icon: Clock },
                      ].map((notif, i) => (
                        <div key={i} className="flex items-start rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                          <notif.icon className="mr-3 mt-0.5 h-5 w-5 text-gray-400" />
                          <div className="flex-1">
                            <div className="text-sm font-semibold text-gray-900">{notif.text}</div>
                            <div className="text-xs text-gray-500">{notif.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="order-1 p-8 lg:order-2 lg:p-12">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                    <Calendar className="h-5 w-5 text-gray-900" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">
                    Stay updated with smart notifications
                  </h3>
                  <p className="mt-4 text-base leading-7 text-gray-600">
                    Get real-time updates when your videos are ready, queued, or need attention. Never miss an important status change.
                  </p>
                  <ul className="mt-6 space-y-3">
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Email and in-app notifications</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Real-time status updates</span>
                    </li>
                    <li className="flex items-start">
                      <CheckCircle2 className="mr-2 mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400" />
                      <span className="text-sm text-gray-600">Customizable notification preferences</span>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              ...and so much more!
            </p>
          </motion.div>

          <div className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-4 sm:mt-20 lg:max-w-none lg:grid-cols-4">
            {[
              { icon: Video, title: "Multi-model", description: "Veo3, Runway, Pika" },
              { icon: Zap, title: "Real-time", description: "Lightning fast" },
              { icon: Shield, title: "Privacy first", description: "Secure by default" },
              { icon: Globe, title: "API access", description: "Full integration" },
              { icon: Settings, title: "Customization", description: "Every parameter" },
              { icon: Sparkles, title: "Quality presets", description: "Pro outputs" },
              { icon: Link2, title: "Easy sharing", description: "One-click share" },
              { icon: Users, title: "Collaboration", description: "Work together" },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
                viewport={{ once: true }}
                className="group rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 transition-colors group-hover:border-gray-300 group-hover:bg-gray-100">
                  <feature.icon className="h-5 w-5 text-gray-900" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-xs text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
