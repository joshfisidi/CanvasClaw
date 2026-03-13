import type { NextConfig } from "next"
import path from "path"

const nextConfig: NextConfig = {
  reactStrictMode: false,
  allowedDevOrigins: ["10.0.0.241"],
  outputFileTracingRoot: path.join(__dirname, "../../"),
}

export default nextConfig
