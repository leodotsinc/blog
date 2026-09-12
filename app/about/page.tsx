import { siteMetadata } from "@/data/siteMetadata";
import Image from "next/image";
import WavingHand from "@/components/WavingHand";
import SectionContainer from "@/components/SectionContainer";
import SocialIcon from "@/components/SocialIcon";

export const metadata = {
  title: "About - Leo",
  description: "About me",
};

export default function AboutPage() {
  return (
    <SectionContainer>
      <div className="py-8">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4">About</h1>
        <hr className="my-8 border-gray-200 dark:border-gray-700" />
        <div className="flex flex-col md:flex-row md:space-x-12">
          {/* Left Column */}
          <div className="md:w-1/3 flex flex-col items-center">
            <Image
              src="/profile-image.jpg"
              alt="Leonardo Torres"
              width={192}
              height={192}
              className="rounded-full mb-4"
            />
            <h2 className="text-2xl font-bold">Leonardo Torres</h2>
            <p className="text-lg text-muted-foreground">
              Tech Lead @ Getnet (Santander)
            </p>
            <div className="flex justify-center space-x-4 mt-4">
              <SocialIcon kind="github" href={siteMetadata.github} size={6} />
              <SocialIcon kind="linkedin" href={siteMetadata.linkedin} size={6} />
              <SocialIcon kind="mail" href={`mailto:${siteMetadata.email}`} size={6} />
              <SocialIcon kind="instagram" href={siteMetadata.instagram} size={6} />
            </div>
          </div>

          {/* Right Column */}
          <div className="md:w-2/3 mt-8 md:mt-0">
            <h1 className="text-3xl sm:text-3xl font-bold mb-4 text-center md:text-left">
              Hi{""}
              <WavingHand className="wave inline-block w-8 h-8 ml-2" />,
              I&apos;m Leonardo Torres
            </h1>
            <div className="space-y-4">
              <p className="text-base text-foreground">
                I&apos;m a Tech Lead from Brazil 🇧🇷 with a passion for AI and
                full-stack development. I enjoy creating innovative solutions
                that enhance efficiency and performance. My journey in
                technology involves building AI-powered applications,
                microservices, and full-stack solutions that challenge the
                boundaries of what&apos;s possible. I hold a Bachelor&apos;s
                degree in Information Systems.
              </p>
              <p className="text-base text-foreground">
                Currently, I&apos;m a Tech Lead at Getnet, Santander&apos;s payments company, where I focus on
                integrating cutting-edge AI features and developing robust
                backend systems. Whether I&apos;m coding or working with
                cross-functional teams, my goal is to ensure our products not
                only meet the highest standards but also amaze our users ✨.
              </p>
              <p className="text-base text-foreground">
                When I&apos;m not in front of a screen, you can find me
                listening to my favorite music 🎶 or watching movies 🎬. These
                hobbies keep my creativity alive and my mind sharp.
              </p>
              <p className="text-base text-foreground">
                I&apos;m currently diving deep into AI concepts, mastering
                Golang, and exploring AWS certifications ☁️. Continuous
                learning is my motto, and I&apos;m always searching for the
                next big thing in technology 🚀.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
}
