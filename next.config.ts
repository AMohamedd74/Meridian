import { withSentryConfig } from "@sentry/nextjs/config";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

/**
 * Sentry only does anything at build time when SENTRY_AUTH_TOKEN, SENTRY_ORG
 * and SENTRY_PROJECT are set (that's what uploads source maps). Without them
 * the build is unchanged.
 */
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  // Source maps are uploaded to Sentry, not served publicly.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
