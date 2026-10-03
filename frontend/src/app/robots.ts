import type { MetadataRoute } from "next";

/** Internal system: nothing is indexed. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
