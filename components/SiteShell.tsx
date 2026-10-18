import Footer from "@/components/Footer";
import SiteHeader from "@/components/nav/SiteHeader";
import SmoothScroll from "@/components/SmoothScroll";
import { buildCommandIndex } from "@/lib/commandIndex";

export default function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <SiteHeader commands={buildCommandIndex()} />
      <main className="flex-grow pt-20">{children}</main>
      <Footer />
    </>
  );
}
