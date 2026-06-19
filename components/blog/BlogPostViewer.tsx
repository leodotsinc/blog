"use client"

import { AnimatePresence, motion } from "framer-motion"
import { Languages } from "lucide-react"
import { useState } from "react"

import MDXContent from "@/components/mdx/MDXContent"
import TagList from "@/components/shared/TagList"
import { cn } from "@/lib/utils"

type Locale = "en" | "pt-BR"

interface PostVariant {
  title: string
  description: string
  bodyCode: string
}

interface BlogPostViewerProps {
  dateLabels: Record<Locale, string>
  tags: string[]
  english: PostVariant
  portuguese: PostVariant
}

const languageOptions: Array<{ value: Locale; label: string }> = [
  { value: "en", label: "English" },
  { value: "pt-BR", label: "PT-BR" },
]

export default function BlogPostViewer({
  dateLabels,
  tags,
  english,
  portuguese,
}: BlogPostViewerProps) {
  const [locale, setLocale] = useState<Locale>("en")

  const activeVariant = locale === "en" ? english : portuguese

  return (
    <>
      <header className="mb-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <time className="text-sm text-muted-foreground">
            {dateLabels[locale]}
          </time>

          <div
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 p-1 shadow-sm backdrop-blur"
            role="group"
            aria-label="Select article language"
          >
            <span className="ml-2 hidden items-center gap-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground sm:inline-flex">
              <Languages className="h-3.5 w-3.5" />
              Language
            </span>

            <div className="relative inline-flex rounded-full bg-muted p-1">
              {languageOptions.map((option) => {
                const active = locale === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setLocale(option.value)}
                    className="relative min-w-24 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  >
                    {active && (
                      <motion.span
                        layoutId="language-toggle-pill"
                        className="absolute inset-0 rounded-full bg-primary shadow-sm"
                        transition={{ type: "spring", stiffness: 500, damping: 36 }}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 transition-colors duration-200",
                        active ? "text-primary-foreground" : "text-muted-foreground"
                      )}
                    >
                      {option.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={locale}
            initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
            transition={{ duration: 0.28, ease: "easeOut" }}
          >
            <h1 className="mb-4 text-4xl font-bold">{activeVariant.title}</h1>
            <p className="mb-6 text-lg text-muted-foreground">
              {activeVariant.description}
            </p>
            <TagList tags={tags} />
          </motion.div>
        </AnimatePresence>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={`${locale}-body`}
          initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -16, filter: "blur(6px)" }}
          transition={{ duration: 0.32, ease: "easeOut" }}
        >
          <MDXContent code={activeVariant.bodyCode} />
        </motion.div>
      </AnimatePresence>
    </>
  )
}
