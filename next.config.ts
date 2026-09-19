import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // snarkjs는 워커/wasm을 쓰므로 서버 번들에 넣지 않고 Node 그대로 로드한다 (/api/verify 용)
  serverExternalPackages: ["snarkjs"],
};

export default nextConfig;
