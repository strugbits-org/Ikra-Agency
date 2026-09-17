import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /**
     * The client's Wix Media Manager, which is where the case-study cards' artwork lives now
     * (see `components/cases/content.ts`). `next/image` refuses any remote host that isn't
     * listed here, and the pattern is narrowed to `/media/**` rather than the bare host so the
     * optimiser can only ever be pointed at files, not at any other path Wix serves from it.
     *
     * The founders' photographs on `/playground` come from the same account and deliberately
     * do *not* need this: they are sized at the CDN and drawn with a plain `<img>`. It is the
     * case-study cards that go through `next/image`, because they already did when their
     * images sat in `/public` and the move to the CMS was not the moment to change how they
     * are delivered as well.
     */
    remotePatterns: [new URL("https://static.wixstatic.com/media/**")],
  },
};

export default nextConfig;
