'use client'

import { useMDXComponent } from 'next-contentlayer2/hooks'

interface MDXContentProps {
  code: string
}

const components = {
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h1 className="text-3xl font-bold mb-4 text-gray-900" {...props} />,
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h2 id={props.id} className="text-xl font-bold mt-6 mb-3 scroll-mt-24 text-gray-900" {...props} />,
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => <h3 id={props.id} className="text-lg font-semibold mt-4 mb-2 text-gray-900" {...props} />,
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => <p className="mb-3 text-base text-gray-700 leading-relaxed" {...props} />,
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => <ul className="list-disc pl-6 mb-3 space-y-1" {...props} />,
  li: (props: React.HTMLAttributes<HTMLLIElement>) => <li className="text-base text-gray-700" {...props} />,
  strong: (props: React.HTMLAttributes<HTMLElement>) => <strong className="font-semibold text-gray-900" {...props} />,
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => <hr className="my-8 border-gray-300" {...props} />,
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a className="text-blue-600 hover:text-blue-800 hover:underline" {...props} />,
}

export default function MDXContent({ code }: MDXContentProps) {
  const MDXComponent = useMDXComponent(code)
  return (
    <div className="prose max-w-none">
      {/* eslint-disable-next-line react-hooks/static-components -- Contentlayer useMDXComponent supplies the component compiled from MDX code. */}
      <MDXComponent components={components} />
    </div>
  )
}
