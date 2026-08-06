import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import ServicesGrid from "@/components/home/ServicesGrid";
import TestimonialsCarousel from "@/components/home/TestimonialsCarousel";
import HeroSection from "@/components/home/HeroSection";
import ProcessSteps from "@/components/home/ProcessSteps";
import HeritageCarousel from "@/components/home/HeritageCarousel";
import ImmersiveGallery from "@/components/home/ImmersiveGallery";
import AboutUsSection from "@/components/home/AboutUsSection";
import PartnersSection from "@/components/home/PartnersSection";
import NewsletterSection from "@/components/home/NewsletterSection";
import { T } from "@/lib/translation";

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero Section (Immersive Video/Particles) */}
      <HeroSection />

      {/* Services — bento asymétrique */}
      <section className="bg-[#FBFAF7] py-20 md:py-28">
        <div className="mx-auto max-w-[1400px] px-5 md:px-8">
          <div className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <h2 className="font-fraunces text-4xl font-semibold leading-[1.05] tracking-[-0.02em] text-[#0d1a12] md:text-5xl">
                <T>Tout votre retour</T>, <span className="italic text-[#008751]"><T>un seul partenaire.</T></span>
              </h2>
              <p className="mt-4 max-w-xl font-geist text-lg leading-relaxed text-[#4a5751]">
                <T>De l&apos;administratif à l&apos;investissement, chaque étape est prise en charge par une équipe qui connaît le terrain.</T>
              </p>
            </div>
            <Link href="/services" className="group inline-flex shrink-0 items-center gap-2 font-geist text-[15px] font-semibold text-[#0d1a12] underline decoration-[#FCD116] decoration-2 underline-offset-[6px] transition-colors hover:text-[#008751]">
              <T>Voir tous les services</T>
              <ArrowRight size={15} weight="bold" className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <ServicesGrid />
        </div>
      </section>

      {/* About Us Section (Qui sommes-nous) */}
      <AboutUsSection />

      {/* Heritage Section (Infinite Scroll) */}
      <HeritageCarousel />

      {/* Immersive Art Gallery */}
      <ImmersiveGallery />

      {/* Process Steps (Notre Démarche) */}
      <ProcessSteps />

      {/* Testimonials */}
      <TestimonialsCarousel />

      {/* Partners Section */}
      <PartnersSection />

      {/* Newsletter */}
      <NewsletterSection />

      {/* Call to Action */}
      <section className="py-16 md:py-24 bg-[#1a2332] text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/10 -skew-x-12 transform origin-bottom-right" />
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 md:mb-6"><T>Prêt à Sauter le Pas ?</T></h2>
          <p className="text-xl opacity-80 mb-8 max-w-2xl mx-auto">
            <T>Ne laissez pas les démarches administratives freiner vos rêves. Prenons 15 minutes pour discuter de votre projet.</T>
          </p>
          <Link href="/rendez-vous">
            <Button size="lg" className="bg-secondary text-foreground hover:bg-secondary/90 rounded-full px-10 h-16 text-xl shadow-lg hover:scale-105 transition-transform">
              <T>Réserver un Appel Gratuit</T>
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

