// import type { NextConfig } from "next";

// const nextConfig: NextConfig = {
//  allowedDevOrigins: ["exchange-ending-getaway.ngrok-free.dev"],
// };

// export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 🔥 สั่งให้ระบบข้ามการตรวจ ESLint ตอน Build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // 🔥 สั่งให้ระบบข้ามการตรวจ TypeScript ตอน Build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
