import type { MetadataRoute } from "next";
import { allProjects } from "contentlayer/generated";
import { getBlogIndexPosts } from "@/lib/posts";

const siteUrl = "https://leodots.com";

const staticPaths = ["", "/about", "/blog", "/projects", "/resume"] as const;

function isDraft(document: object) {
  return "draft" in document && (document as { draft?: boolean }).draft === true;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: path ? `${siteUrl}${path}` : siteUrl,
  }));

  const posts: MetadataRoute.Sitemap = getBlogIndexPosts()
    .filter((post) => !isDraft(post))
    .map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: new Date(post.date),
    }));

  const projects: MetadataRoute.Sitemap = [...allProjects]
    .filter((project) => !isDraft(project))
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .map((project) => ({
      url: `${siteUrl}/projects/${project.slug}`,
      lastModified: new Date(project.date),
    }));

  return [...staticPages, ...posts, ...projects];
}
