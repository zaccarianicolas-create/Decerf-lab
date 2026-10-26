"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

type Partner = {
  id: string;
  nom: string;
  site_url: string | null;
  logo_url: string | null;
};

const subscribeReducedMotion = (callback: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", callback);
  return () => media.removeEventListener("change", callback);
};
const getReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const getServerReducedMotion = () => true;

export function PartnersCarousel({ partners }: { partners: Partner[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [hasOverflow, setHasOverflow] = useState(false);
  const [paused, setPaused] = useState(false);
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, getServerReducedMotion);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    const measure = () => setHasOverflow(rail.scrollWidth > rail.clientWidth + 2);
    const observer = new ResizeObserver(measure);
    observer.observe(rail);
    Array.from(rail.children).forEach((child) => observer.observe(child));
    const frame = requestAnimationFrame(measure);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [partners.length]);

  useEffect(() => {
    if (!hasOverflow || paused || reduceMotion) return;
    const timer = window.setInterval(() => {
      const rail = railRef.current;
      if (!rail) return;
      const maxScroll = rail.scrollWidth - rail.clientWidth;
      if (maxScroll <= 2) return;
      const next = rail.scrollLeft >= maxScroll - 8
        ? 0
        : Math.min(rail.scrollLeft + Math.max(220, rail.clientWidth * 0.72), maxScroll);
      rail.scrollTo({ left: next, behavior: "smooth" });
    }, 4200);
    return () => window.clearInterval(timer);
  }, [hasOverflow, paused, reduceMotion]);

  if (partners.length === 0) return null;

  const scroll = (direction: -1 | 1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy({ left: direction * Math.max(220, rail.clientWidth * 0.72), behavior: "smooth" });
  };

  return (
    <section aria-label="Nos partenaires" className="border-y border-slate-200 bg-white py-8 sm:py-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Nos partenaires</h2>
          {hasOverflow && (
            <div className="flex items-center gap-1">
              <Button type="button" variant="outline" size="icon" onClick={() => scroll(-1)} aria-label="Partenaires précédents">
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => scroll(1)} aria-label="Partenaires suivants">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div
          ref={railRef}
          role="list"
          aria-label="Logos des partenaires"
          onPointerEnter={() => setPaused(true)}
          onPointerLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
          }}
          className={`flex items-center gap-8 overflow-x-auto overscroll-x-contain scrollbar-none ${hasOverflow ? "justify-start scroll-smooth" : "justify-center"}`}
        >
          {partners.map((partner) => {
            const logo = partner.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={partner.logo_url} alt={`Logo ${partner.nom}`} className="max-h-16 max-w-[210px] object-contain" />
            ) : (
              <span className="font-display text-xl font-semibold tracking-tight text-slate-800">{partner.nom}</span>
            );
            return (
              <div key={partner.id} role="listitem" className="flex min-h-20 min-w-[200px] shrink-0 items-center justify-center px-4">
                {partner.site_url ? (
                  <a href={partner.site_url} target="_blank" rel="noopener noreferrer" aria-label={`Visiter ${partner.nom}`} className="inline-flex min-h-16 items-center justify-center rounded-md transition-opacity hover:opacity-75 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600">
                    {logo}
                    <ExternalLink className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
                  </a>
                ) : <div className="flex min-h-16 items-center justify-center">{logo}</div>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
