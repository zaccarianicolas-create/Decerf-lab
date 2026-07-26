"use client";

import { useEffect, useRef, useState } from "react";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  unreadCount: number;
  chatPath: string;
}

export function ChatModalWindow({
  isOpen,
  onClose,
  unreadCount,
  chatPath,
}: ChatModalProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const supabase = useRef(createClient());

  const getModalDimensions = () => {
    const width = Math.min(420, window.innerWidth - 24);
    const height = Math.min(680, window.innerHeight - 24);
    return { width, height };
  };

  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const { width, height } = getModalDimensions();
    setPosition({
      x: Math.max(8, Math.round((window.innerWidth - width) / 2)),
      y: Math.max(8, Math.round((window.innerHeight - height) / 2)),
    });
    setIsMinimized(false);
  }, [isOpen]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.current.auth.getUser();
      setIsAuthenticated(!!user);
    };

    if (isOpen) {
      void checkAuth();
    }
  }, [isOpen]);

  // Mouse down on header - start dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMinimized || !modalRef.current) return;

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
      const { width, height } = getModalDimensions();

      // Keep within viewport
      const maxX = window.innerWidth - width;
      const maxY = window.innerHeight - (isMinimized ? 56 : height);

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
  }, [isDragging, dragOffset, isMinimized]);

  if (!isOpen) return null;

  const modalDimensions =
    typeof window !== "undefined"
      ? getModalDimensions()
      : { width: 420, height: 680 };

  return (
    <div
      ref={modalRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
        width: `${modalDimensions.width}px`,
        height: isMinimized ? "auto" : `${modalDimensions.height}px`,
        maxWidth: "calc(100vw - 16px)",
        maxHeight: "calc(100vh - 16px)",
      }}
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
          <h3 className="font-semibold">Messages</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="rounded p-1 hover:bg-sky-500"
            aria-label={isMinimized ? "Maximiser" : "Minimiser"}
          >
            {isMinimized ? (
              <Maximize2 className="h-4 w-4" />
            ) : (
              <Minimize2 className="h-4 w-4" />
            )}
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

      {/* Content - Hidden when minimized */}
      {!isMinimized && (
        <div className="flex-1 overflow-hidden bg-white">
          {!isAuthenticated ? (
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
          ) : (
            <iframe
              src={chatPath}
              title="Chat"
              className="h-full w-full border-none"
              style={{ pointerEvents: isDragging ? "none" : "auto" }}
            />
          )}
        </div>
      )}
    </div>
  );
}
