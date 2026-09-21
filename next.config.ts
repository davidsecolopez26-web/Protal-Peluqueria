import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev server reachable from other machines on the LAN (e.g. VS Code Remote from a Mac)
  allowedDevOrigins: ['192.168.0.36'],
};

export default nextConfig;
