'use client';

import { motion } from 'framer-motion';
import { Video, Music, Sparkles, Zap, Wand2, Layers } from 'lucide-react';

const features = [
	{
		icon: Video,
		title: 'AI Video Generation',
		description:
			'Create professional videos from simple text prompts. Our AI understands context and generates stunning visuals that match your vision.',
	},
	{
		icon: Music,
		title: 'Smart Audio Synthesis',
		description:
			'Generate custom soundtracks, voice-overs, and sound effects. Perfect audio that complements your content automatically.',
	},
	{
		icon: Sparkles,
		title: 'Auto Enhancement',
		description:
			'Intelligent editing and quality improvements powered by machine learning. Your content looks professional without manual tweaking.',
	},
	{
		icon: Zap,
		title: 'Real-time Processing',
		description: 'Fast rendering with cloud-powered AI models. Get your results instantly, no waiting required.',
	},
	{
		icon: Wand2,
		title: 'Style Transfer',
		description: 'Apply artistic styles and effects instantly. Transform your videos with cutting-edge AI technology.',
	},
	{
		icon: Layers,
		title: 'Multi-format Export',
		description: 'Export in any format optimized for your platform. From social media to cinema, we have you covered.',
	},
];

export default function FeaturesSection() {
	return (
		<section className="relative overflow-hidden bg-white py-24 sm:py-32">
			{/* Visible Grid Background */}
			<div className="absolute inset-0">
				<svg
					className="absolute inset-0 h-full w-full"
					xmlns="http://www.w3.org/2000/svg"
				>
					<defs>
						<pattern
							id="features-grid"
							width="80"
							height="80"
							patternUnits="userSpaceOnUse"
						>
							<path
								d="M 80 0 L 0 0 0 80"
								fill="none"
								stroke="rgba(0,0,0,0.05)"
								strokeWidth="1"
							/>
						</pattern>
					</defs>
					<rect width="100%" height="100%" fill="url(#features-grid)" />
				</svg>
			</div>

			<div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-8">
				{/* Section Header */}
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					viewport={{ once: true, amount: 0.3 }}
					className="mx-auto max-w-2xl text-center"
				>
					<h2 className="text-base font-semibold leading-7 text-neutral-600">
						Everything you need
					</h2>
					<p className="mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
						Powerful tools for creators
					</p>
					<p className="mt-6 text-lg leading-8 text-neutral-600">
						Create, edit, and share professional content with AI-powered tools
						designed for modern creators.
					</p>
				</motion.div>

				{/* Features Grid */}
				<div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
					<dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-3">
						{features.map((feature, index) => (
							<motion.div
								key={feature.title}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								transition={{ duration: 0.5, delay: index * 0.1 }}
								viewport={{ once: true, amount: 0.3 }}
								whileHover={{ y: -5 }}
								className="flex flex-col"
							>
								<dt className="text-base font-semibold leading-7 text-neutral-900">
									<motion.div
										whileHover={{ rotate: 360 }}
										transition={{ duration: 0.6 }}
										className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-neutral-900"
									>
										<feature.icon
											className="h-6 w-6 text-white"
											aria-hidden="true"
										/>
									</motion.div>
									{feature.title}
								</dt>
								<dd className="mt-1 flex flex-auto flex-col text-base leading-7 text-neutral-600">
									<p className="flex-auto">{feature.description}</p>
								</dd>
							</motion.div>
						))}
					</dl>
				</div>
			</div>
		</section>
	);
}