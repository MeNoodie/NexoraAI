import { DemoPreview } from "@/components/landing/demo-preview";
import { FAQ } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Footer } from "@/components/landing/footer";
import { GradientBackground } from "@/components/landing/gradient-background";
import { Hero } from "@/components/landing/hero";
import { Navbar } from "@/components/landing/navbar";
import { Technology } from "@/components/landing/technology";
import { Workflow } from "@/components/landing/workflow";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <GradientBackground />
      <div className="relative z-10">
        <Navbar />
        <Hero />
        <Features />
        <Workflow />
        <DemoPreview />
        <Technology />
        <FAQ />
        <Footer />
      </div>
    </main>
  );
}
