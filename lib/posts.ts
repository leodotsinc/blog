import { allPosts } from "contentlayer/generated"

export type BlogPost = (typeof allPosts)[number]

const isEnglishPost = (post: BlogPost) => post._raw.flattenedPath.endsWith(".en")

const sortNewestFirst = (a: BlogPost, b: BlogPost) =>
  new Date(b.date).getTime() - new Date(a.date).getTime()

export type BlogPostBundle = {
  slug: string
  defaultPost: BlogPost
  english?: BlogPost
  portuguese?: BlogPost
}

function buildBlogPostBundles() {
  const bundles = new Map<string, BlogPostBundle>()

  for (const post of [...allPosts].sort(sortNewestFirst)) {
    const existing = bundles.get(post.slug)

    if (!existing) {
      bundles.set(post.slug, {
        slug: post.slug,
        defaultPost: post,
        ...(isEnglishPost(post) ? { english: post } : { portuguese: post }),
      })
      continue
    }

    if (isEnglishPost(post)) {
      existing.english = post
    } else {
      existing.portuguese = post
    }

    existing.defaultPost = existing.english ?? existing.portuguese ?? post
  }

  return [...bundles.values()].sort((a, b) =>
    sortNewestFirst(a.defaultPost, b.defaultPost)
  )
}

export function getBlogIndexPosts() {
  return buildBlogPostBundles().map((bundle) => bundle.defaultPost)
}

export function getBlogPostSlugs() {
  return buildBlogPostBundles().map((bundle) => ({
    slug: bundle.slug,
  }))
}

export function getBlogPostBundle(slug: string) {
  return buildBlogPostBundles().find((bundle) => bundle.slug === slug) ?? null
}
