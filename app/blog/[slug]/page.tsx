import { notFound } from "next/navigation"

import SectionContainer from "@/components/SectionContainer"
import BlogPostViewer from "@/components/blog/BlogPostViewer"
import BackLink from "@/components/shared/BackLink"
import { formatDate } from "@/lib/formatDate"
import { getBlogPostBundle, getBlogPostSlugs } from "@/lib/posts"

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return getBlogPostSlugs()
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const postBundle = getBlogPostBundle(slug)

  if (!postBundle) {
    return { title: "Post Not Found" }
  }

  return {
    title: `${postBundle.defaultPost.title} - Leo`,
    description: postBundle.defaultPost.description,
  }
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params
  const postBundle = getBlogPostBundle(slug)

  if (!postBundle) {
    notFound()
  }

  const defaultPost = postBundle.defaultPost

  return (
    <SectionContainer size="sm">
      <article className="py-8">
        <BackLink href="/blog" label="Back to blog" />

        <BlogPostViewer
          dateLabels={{
            en: formatDate(defaultPost.date, "long", "en-US"),
            "pt-BR": formatDate(defaultPost.date, "long", "pt-BR"),
          }}
          tags={defaultPost.tags}
          english={{
            title: postBundle.english?.title ?? defaultPost.title,
            description:
              postBundle.english?.description ?? defaultPost.description,
            bodyCode: postBundle.english?.body.code ?? defaultPost.body.code,
          }}
          portuguese={{
            title: postBundle.portuguese?.title ?? defaultPost.title,
            description:
              postBundle.portuguese?.description ?? defaultPost.description,
            bodyCode:
              postBundle.portuguese?.body.code ?? defaultPost.body.code,
          }}
        />
      </article>
    </SectionContainer>
  )
}
