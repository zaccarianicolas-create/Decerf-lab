"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  chatPath: string;
}

const DEFAULT_MODAL_DIMENSIONS = { width: 420, height: 680 };

export function ChatModalWindow({
  isOpen,
  onClose,
  unreadCount,
  chatPath,
}: ChatModalProps) {
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [modalDimensions, setModalDimensions] = useState(
    DEFAULT_MODAL_DIMENSIONS
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  const chatUrl = `${chatPath}${chatPath.includes("?") ? "&" : "?"}embed=1`;

  const getModalDimensions = () => {
    const width = Math.min(440, window.innerWidth - 20);
    const height = Math.min(700, window.innerHeight - 20);
    return { width, height };
  };

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const dims = getModalDimensions();
    setModalDimensions(dims);
    setPosition({
      x: Math.max(8, Math.round((window.innerWidth - dims.width) / 2)),
      y: Math.max(8, Math.round((window.innerHeight - dims.height) / 2)),
    });
    // Reset only failure state on reopen; keep iframe loaded state for fast toggles.
    setIframeFailed(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !isAuthenticated) return;
    const t = window.setTimeout(() => {
      if (!iframeLoaded) setIframeFailed(true);
    }, 2500);
    return () => window.clearTimeout(t);
  }, [isOpen, isAuthenticated, iframeLoaded]);

  // Check authentication once; keep result for subsequent opens.
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.current.auth.getUser();
      setIsAuthenticated(!!user);
      setAuthChecked(true);
    };

    void checkAuth();
  }, []);

  // Mouse down on header - start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!modalRef.current) return;

    const rect = modalRef.current.getBoundingClientRect();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  // Mouse move - drag window
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!modalRef.current) return;

      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      const dims = getModalDimensions();
      setModalDimensions(dims);

      // Keep within viewport
      const maxX = window.innerWidth - dims.width;
      const maxY = window.innerHeight - dims.height;

      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  return (
    <div
      ref={modalRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        width: `${modalDimensions.width}px`,
        height: `${modalDimensions.height}px`,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100vh - 16px)",
        opacity: isOpen ? 1 : 0,
        pointerEvents: isOpen ? "auto" : "none",
        transform: isOpen ? "translateY(0)" : "translateY(8px)",
        visibility: isOpen ? "visible" : "hidden",
        transition: "opacity 120ms ease, transform 120ms ease",
      }}
      aria-hidden={!isOpen}
      className="pointer-events-auto flex flex-col rounded-lg border border-gray-200 bg-white shadow-2xl"
    >
      {/* Header - Draggable */}
      <div
        onMouseDown={handleMouseDown}
        className={`flex cursor-move items-center justify-between border-b border-gray-200 bg-gradient-to-r from-sky-600 to-sky-700 px-4 py-3 text-white ${
          isDragging ? "select-none" : ""
        }`}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Messages</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-sky-500"
            aria-label="Rabaisser"
            title="Rabaisser"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button
            onClick={onClose}
            className="rounded p-1 hover:bg-sky-500"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden bg-white">
        {!authChecked ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
              <p className="mt-3 text-sm text-gray-600">Préparation de la messagerie...</p>
            </div>
          </div>
        ) : !isAuthenticated ? (
          <div className="flex h-full items-center justify-center p-4 text-center">
            <div>
              <p className="text-sm text-gray-600">
                Connectez-vous pour accéder à la messagerie
              </p>
              <a
                href="/login"
                className="mt-3 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Se connecter
              </a>
            </div>
          </div>
        ) : iframeFailed ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-xs space-y-3">
              <p className="text-sm font-semibold text-gray-900">
                Messagerie indisponible dans la bulle
              </p>
              <p className="text-sm text-gray-600">
                Aucune conversation pour le moment, ou affichage bloqué ici.
                Utilisez le bouton + ci-dessus pour ouvrir la page complète.
              </p>
              <a
                href={chatPath}
                className="inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700"
              >
                Ouvrir la messagerie complète
              </a>
            </div>
          </div>
        ) : (
          <div className="relative h-full">
            {!iframeLoaded && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/95">
                <div className="text-center">
                  <div className="mx-auto h-5 w-5 animate-spin rounded-full border-2 border-sky-600 border-t-transparent" />
                  <p className="mt-3 text-sm text-gray-600">Chargement des conversations...</p>
                </div>
              </div>
            )}
            <iframe
              src={chatUrl}
              title="Chat"
              className="h-full w-full border-none"
              onLoad={() => {
                setIframeLoaded(true);
                setIframeFailed(false);
              }}
              onError={() => {
                setIframeFailed(true);
              }}
              style={{ pointerEvents: isDragging ? "none" : "auto" }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
