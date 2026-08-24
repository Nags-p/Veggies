/** @type {import('next').NextConfig} */
const isGithubActions = process.env.GITHUB_ACTIONS === 'true';
const repoName = process.env.REPO_NAME || 'veggies';

const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  transpilePackages: ['@veggies/shared'],
  basePath: isGithubActions ? `/${repoName}/customer` : '',
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
