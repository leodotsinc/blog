import { siteMetadata } from "@/data/siteMetadata";
import Link from "next/link";
import NowPlaying from "@/components/spotify/NowPlaying";
import SocialIcon from "@/components/SocialIcon";
import TechIcon from "@/components/TechIcon";
import SectionContainer from "@/components/SectionContainer";

export default function Footer() {
  return (
    <footer className="site-footer">
      <SectionContainer>
        <div className="mb-0 flex flex-col justify-start space-y-3 py-10">
          <div className="flex flex-col items-center space-y-3 text-sm sm:flex-row sm:justify-between sm:text-base">
            <NowPlaying />
            <ul className="flex cursor-pointer items-center space-x-5">
              <li>
                <SocialIcon
                  kind="linkedin"
                  href={siteMetadata.linkedin}
                  size={5}
                />
              </li>
              <li>
                <SocialIcon kind="github" href={siteMetadata.github} size={5} />
              </li>
              <li>
                <SocialIcon
                  kind="mail"
                  href={`mailto:${siteMetadata.email}`}
                  size={5}
                />
              </li>
              <li>
                <SocialIcon
                  kind="spotify"
                  href={siteMetadata.spotify}
                  size={5}
                />
              </li>
              <li>
                <SocialIcon
                  kind="instagram"
                  href={siteMetadata.instagram}
                  size={5}
                />
              </li>
            </ul>
          </div>

          <div className="flex flex-col items-center space-y-3 text-xs sm:flex-row sm:justify-between sm:text-sm">
            <ul className="flex space-x-2">
              <li>{`© ${new Date().getFullYear()}`}</li>
              <li>{` • `}</li>
              <li>
                <Link href="/">{siteMetadata.title}</Link>
              </li>
              <li>{` • `}</li>
              <li>
                <SocialIcon
                  kind="githubFork"
                  href={siteMetadata.siteRepo}
                  size={5}
                />
              </li>
            </ul>
            <ul className="flex items-center space-x-2">
              <li className="text-muted-foreground">{`Powered by`}</li>
              <li>
                <TechIcon kind="nextjs" href="https://nextjs.org" size={5} />
              </li>
              <li>
                <TechIcon
                  kind="typescript"
                  href="https://www.typescriptlang.org"
                  size={5}
                />
              </li>
              <li>
                <TechIcon
                  kind="tailwind"
                  href="https://tailwindcss.com"
                  size={5}
                />
              </li>
              <li>
                <TechIcon kind="shadcn" href="https://ui.shadcn.com" size={5} />
              </li>
              <li>
                <TechIcon
                  kind="contentlayer"
                  href="https://contentlayer.dev"
                  size={5}
                />
              </li>
            </ul>
          </div>
        </div>
      </SectionContainer>
    </footer>
  );
}
