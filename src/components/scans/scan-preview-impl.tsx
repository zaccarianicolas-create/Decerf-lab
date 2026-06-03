"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ScanPreviewImpl({
  open,
  onClose,
  url,
  fileName,
  format,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  fileName: string;
  format: string | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isSupported = useMemo(
    () => format === "stl" || format === "obj" || format === "ply",
    [format]
  );

  useEffect(() => {
    if (!open || !containerRef.current || !isSupported) return;

    const container = containerRef.current;
    setLoading(true);
    setError(null);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);

    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 120);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.autoRotate = false;

    scene.add(new THREE.AmbientLight(0xffffff, 1.8));
    const directional = new THREE.DirectionalLight(0xffffff, 2.5);
    directional.position.set(40, 60, 80);
    scene.add(directional);

    const grid = new THREE.GridHelper(180, 18, 0xd1d5db, 0xe5e7eb);
    grid.position.y = -45;
    scene.add(grid);

    let model: THREE.Object3D | null = null;

    const fitModel = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());

      object.position.x += object.position.x - center.x;
      object.position.y += object.position.y - center.y;
      object.position.z += object.position.z - center.z;

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 70 / maxDim;
      object.scale.setScalar(scale);

      controls.target.set(0, 0, 0);
      camera.position.set(0, 0, Math.max(120, maxDim * 1.6));
      controls.update();
    };

    const addObject = (object: THREE.Object3D) => {
      model = object;
      scene.add(object);
      fitModel(object);
      setLoading(false);
    };

    const loaderError = () => {
      setError("Impossible de charger l'aperçu 3D.");
      setLoading(false);
    };

    if (format === "stl") {
      new STLLoader().load(url, (geometry) => {
        const material = new THREE.MeshStandardMaterial({
          color: 0xdbeafe,
          metalness: 0.05,
          roughness: 0.45,
        });
        const mesh = new THREE.Mesh(geometry, material);
        addObject(mesh);
      }, undefined, loaderError);
    } else if (format === "obj") {
      new OBJLoader().load(url, (object) => {
        object.traverse((child: any) => {
          if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({
              color: 0xdbeafe,
              metalness: 0.05,
              roughness: 0.45,
            });
          }
        });
        addObject(object);
      }, undefined, loaderError);
    } else if (format === "ply") {
      new PLYLoader().load(url, (geometry) => {
        geometry.computeVertexNormals();
        const material = new THREE.MeshStandardMaterial({
          color: 0xdbeafe,
          metalness: 0.05,
          roughness: 0.45,
          vertexColors: Boolean(geometry.getAttribute("color")),
        });
        const mesh = new THREE.Mesh(geometry, material);
        addObject(mesh);
      }, undefined, loaderError);
    } else {
      setLoading(false);
      setError("Format non compatible pour l'aperçu 3D.");
    }

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
      scene.clear();
      if (model) {
        model.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose?.();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material: any) => material.dispose?.());
            } else {
              child.material.dispose?.();
            }
          }
        });
      }
    };
  }, [open, url, isSupported, format]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-gray-900">Aperçu 3D</p>
            <p className="text-xs text-gray-500">{fileName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="relative flex-1 bg-slate-50">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">
              Chargement de l'aperçu...
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-600">
              {error}
            </div>
          )}
          <div ref={containerRef} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
