import path from "node:path";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Create the next-intl plugin
const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// TODO: Separate app routes (/login, /dashboard) from marketing routes
// (landing page, /contact, /pricing, /docs) so the desktop build only
// ships what desktop users actually need.
const nextConfig: NextConfig = {
	output: "standalone",

	// Prevent stale HTML cache after redeploy
	// Static assets (/_next/static/*) keep content-hash based caching
	async headers() {
		return [
			{
				source: "/:path*",
				headers: [
					{
						key: "Cache-Control",
						// max-age=0: browser always revalidates
						// s-maxage=60: shared cache (CDN) holds 60s
						// stale-while-revalidate=300: serve stale up to 5min during revalidation
						value: "public, max-age=0, s-maxage=60, stale-while-revalidate=300, must-revalidate",
					},
				],
			},
			{
				source: "/_next/static/:path*",
				headers: [
					{
						key: "Cache-Control",
						// Static assets have content hashes — cache aggressively
						value: "public, max-age=31536000, immutable",
					},
				],
			},
		];
	},
	outputFileTracingRoot: path.join(__dirname, ".."),
	reactStrictMode: false,
	typescript: {
		ignoreBuildErrors: true,
	},
	images: {
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				port: "8000",
				pathname: "/api/v1/image-generations/**",
			},
			{
				protocol: "https",
				hostname: "**",
			},
		],
		// Allow remote SVGs (e.g. README badges from img.shields.io, trendshift.io,
		// etc.) which are otherwise blocked by next/image. The CSP below sandboxes
		// the SVG and forbids any embedded scripts, which is the mitigation
		// recommended by Vercel's NEXTJS_SAFE_SVG_IMAGES conformance rule.
		dangerouslyAllowSVG: true,
		contentDispositionType: "attachment",
		contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
	},
	experimental: {
		optimizePackageImports: [
			"lucide-react",
			"@tabler/icons-react",
			"date-fns",
			"@assistant-ui/react",
			"@assistant-ui/react-markdown",
			"motion",
		],
	},
	// Turbopack config (used during `next dev --turbopack`)
	turbopack: {
		rules: {
			"*.svg": {
				loaders: ["@svgr/webpack"],
				as: "*.js",
			},
		},
	},

	// Configure webpack (SVGR)
	webpack: (config) => {
		// SVGR: import *.svg as React components
		const fileLoaderRule = config.module.rules.find(
			(rule: { test?: { test?: (s: string) => boolean } }) => rule.test?.test?.(".svg")
		);
		config.module.rules.push(
			// Re-apply the existing file loader for *.svg?url imports
			{
				...fileLoaderRule,
				test: /\.svg$/i,
				resourceQuery: /url/, // e.g. import icon from './icon.svg?url'
			},
			// Convert all other *.svg imports to React components
			{
				test: /\.svg$/i,
				issuer: fileLoaderRule.issuer,
				resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] },
				use: ["@svgr/webpack"],
			}
		);
		fileLoaderRule.exclude = /\.svg$/i;

		return config;
	},
};

// Wrap the config with MDX and next-intl plugins
const withMDX = createMDX({});

export default withNextIntl(withMDX(nextConfig));
