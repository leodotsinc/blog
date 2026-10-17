'use client'

import { useMDXComponent } from 'next-contentlayer2/hooks'

interface MDXContentProps {
  code: string
}

const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="text-3xl font-bold mb-4" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 id={props.id} className="text-2xl font-bold mt-10 mb-4 scroll-mt-24" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 id={props.id} className="text-xl font-semibold mt-8 mb-3 scroll-mt-24" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 text-base text-muted-foreground leading-relaxed" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="text-base text-muted-foreground" {...props} />
  ),
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-border" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-primary hover:underline" {...props} />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre className="mb-4 rounded-lg overflow-x-auto" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code className="text-sm" {...props} />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote className="border-l-4 border-primary/50 pl-4 my-4 italic text-muted-foreground" {...props} />
  ),
}

export default function MDXContent({ code }: MDXContentProps) {
  const MDXComponent = useMDXComponent(code)
  return (
    <div className="prose prose-neutral dark:prose-invert max-w-none">
      {/* eslint-disable-next-line react-hooks/static-components -- Contentlayer useMDXComponent supplies the component compiled from MDX code. */}
      <MDXComponent components={components} />
    </div>
  )
}
