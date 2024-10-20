/** @type {import('next').NextConfig} */
const nextConfig = {
    env: {
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        FUND_KEY: process.env.FUND_KEY
    },
}

export default nextConfig;
