"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setIsVisible(true);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem("cookie-consent", "accepted");
    localStorage.setItem("cookie-consent-timestamp", new Date().toISOString());
    setIsVisible(false);
  };

  const handleRejectAll = () => {
    localStorage.setItem("cookie-consent", "rejected");
    localStorage.setItem("cookie-consent-timestamp", new Date().toISOString());
    setIsVisible(false);
  };

  if (!isHydrated || !isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <p className="text-sm">
              Nous utilisons des cookies pour améliorer votre expérience sur notre site.
              En continuant, vous acceptez notre{" "}
              <a href="/politique-cookies" className="underline hover:text-gray-300">
                politique cookies
              </a>
              .
            </p>
          </div>

          <div className="flex gap-3 sm:shrink-0">
            <button
              onClick={handleRejectAll}
              className="rounded-md border border-gray-400 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              Refuser
            </button>
            <button
              onClick={handleAcceptAll}
              className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
            >
              Accepter tout
            </button>
          </div>

          <button
            onClick={handleRejectAll}
            className="absolute right-4 top-4 text-gray-400 hover:text-white sm:relative sm:right-0 sm:top-0"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
