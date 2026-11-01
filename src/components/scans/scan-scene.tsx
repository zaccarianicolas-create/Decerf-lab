"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { ZoomIn, ZoomOut, Focus, Grid2X2, Box, RotateCw } from "lucide-react";
import { centerScanModel, scanCameraDistance } from "@/lib/scan-viewer";
import { readerResourceUrl, type ReaderFile } from "@/lib/reader-files";

export function ScanScene({ file, files }: { file: ReaderFile; files: ReaderFile[] }) {
  const host = useRef<HTMLDivElement>(null);
  const actions = useRef<{ view: (name: string) => void; zoom: (factor: number) => void; wire: () => void; grid: () => void; rotate: () => void } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wire, setWire] = useState(false);
  const [grid, setGrid] = useState(true);
  const [rotating, setRotating] = useState(false);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let disposed = false;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true }); }
    catch { queueMicrotask(() => { if (!disposed) { setError("WebGL indisponible sur cet appareil. Le fichier reste téléchargeable."); setLoading(false); } }); return () => { disposed = true; }; }
    let model: THREE.Group | null = null;
    const scene = new THREE.Scene(); scene.background = new THREE.Color("#f3f5f7");
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    element.appendChild(renderer.domElement);
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.2));
    const light = new THREE.DirectionalLight(0xffffff, 2.5); light.position.set(80, 100, 120); scene.add(light);
    const guide = new THREE.GridHelper(100, 10, 0xa3b1bc, 0xd5dce1); guide.position.y = -40; scene.add(guide);
    const resize = () => { const width = element.clientWidth || 1, height = element.clientHeight || 1; renderer.setSize(width,height); camera.aspect = width / height; camera.updateProjectionMatrix(); if(model){camera.position.sub(controls.target).setLength(scanCameraDistance(camera)).add(controls.target);controls.update();} };
    resize(); const observer = new ResizeObserver(resize); observer.observe(element);
    const view = (name: string) => {
      const distance = scanCameraDistance(camera);
      const direction = name === "top" ? new THREE.Vector3(0,1,0.001) : name === "right" ? new THREE.Vector3(1,0,0) : name === "back" ? new THREE.Vector3(0,0,-1) : new THREE.Vector3(0,0,1);
      camera.position.copy(direction.normalize().multiplyScalar(distance)); controls.target.set(0,0,0); controls.update();
    };
    const material = (geometry: THREE.BufferGeometry) => new THREE.MeshStandardMaterial({ color: geometry.getAttribute("color") ? 0xffffff : 0xd9e1e8, vertexColors: Boolean(geometry.getAttribute("color")), roughness: 0.55, side: THREE.DoubleSide });
    const release = (object: THREE.Object3D) => object.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      node.geometry.dispose();
      for (const entry of Array.isArray(node.material) ? node.material : [node.material]) {
        for (const value of Object.values(entry)) if (value instanceof THREE.Texture) { value.dispose(); const source = value.source.data; if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close(); }
        entry.dispose();
      }
    });
    const manager = new THREE.LoadingManager();
    manager.setURLModifier((resource) => readerResourceUrl(resource,file.name,files));
    manager.onError = () => { if (!disposed) setError("Une texture ou un fichier associé n’a pas pu être chargé."); };
    void (async () => {
      try {
        let object: THREE.Object3D;
        const data = await file.file.arrayBuffer();
        if (disposed) return;
        if (file.extension === "stl" || file.extension === "ply") {
          const geometry = file.extension === "stl" ? new STLLoader().parse(data) : new PLYLoader().parse(data);
          geometry.computeVertexNormals(); object = new THREE.Mesh(geometry,material(geometry));
        } else if (file.extension === "obj") {
          const text = new TextDecoder().decode(data);
          const loader = new OBJLoader(manager);
          const libraries = [...text.matchAll(/^mtllib\s+(.+)$/gm)].map((match) => match[1].trim());
          if (libraries.length > 1) throw new Error("OBJ avec plusieurs bibliothèques de matériaux : exporte en GLB pour conserver toutes les textures.");
          if (libraries[0]) {
            const url = readerResourceUrl(libraries[0],file.name,files);
            const companion = files.find((entry) => entry.url === url);
            if (!companion) throw new Error("Fichier MTL manquant.");
            const materialManager = new THREE.LoadingManager(); materialManager.setURLModifier((resource) => readerResourceUrl(resource,companion.name,files)); materialManager.onError = manager.onError;
            const materials = new MTLLoader(materialManager).parse(await companion.file.text(), ""); materials.preload(); loader.setMaterials(materials);
          }
          object = loader.parse(text);
        } else {
          const gltf = await new GLTFLoader(manager).parseAsync(file.extension === "gltf" ? new TextDecoder().decode(data) : data, ""); object = gltf.scene;
        }
        if (disposed) { release(object); return; }
        model = centerScanModel(object); scene.add(model); view("front"); setLoading(false);
      } catch (error) { if (!disposed) { setLoading(false); setError(error instanceof Error ? error.message : "Fichier 3D invalide."); } }
    })();
    actions.current = { view, zoom: (factor) => { camera.position.multiplyScalar(factor); controls.update(); },
      wire: () => { if (!model) return; let enabled = false; model.traverse((node) => { if (!(node instanceof THREE.Mesh)) return; for (const entry of Array.isArray(node.material) ? node.material : [node.material]) if ("wireframe" in entry) { entry.wireframe = !entry.wireframe; enabled = Boolean(entry.wireframe); } }); setWire(enabled); },
      grid: () => { guide.visible = !guide.visible; setGrid(guide.visible); }, rotate: () => { controls.autoRotate = !controls.autoRotate; setRotating(controls.autoRotate); } };
    renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene,camera); });
    return () => { disposed = true; actions.current = null; observer.disconnect(); renderer.setAnimationLoop(null); controls.dispose(); if (model) release(model); guide.geometry.dispose(); (guide.material as THREE.Material).dispose(); renderer.dispose(); renderer.domElement.remove(); };
  }, [file,files]);
  return <div className="flex h-full min-h-0 flex-col">
    <div className="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-white p-2">
      <button type="button" title="Zoom avant" aria-label="Zoom avant" onClick={() => actions.current?.zoom(0.8)} className="rounded p-2 hover:bg-gray-100"><ZoomIn className="h-4 w-4" /></button>
      <button type="button" title="Zoom arrière" aria-label="Zoom arrière" onClick={() => actions.current?.zoom(1.25)} className="rounded p-2 hover:bg-gray-100"><ZoomOut className="h-4 w-4" /></button>
      <button type="button" title="Recentrer" aria-label="Recentrer" onClick={() => actions.current?.view("front")} className="rounded p-2 hover:bg-gray-100"><Focus className="h-4 w-4" /></button>
      <button type="button" title="Filaire" aria-label="Filaire" aria-pressed={wire} onClick={() => actions.current?.wire()} className={`rounded p-2 ${wire ? "bg-sky-100 text-sky-800" : "hover:bg-gray-100"}`}><Box className="h-4 w-4" /></button>
      <button type="button" title="Grille" aria-label="Grille" aria-pressed={grid} onClick={() => actions.current?.grid()} className={`rounded p-2 ${grid ? "bg-sky-100 text-sky-800" : "hover:bg-gray-100"}`}><Grid2X2 className="h-4 w-4" /></button>
      <button type="button" title="Rotation automatique" aria-label="Rotation automatique" aria-pressed={rotating} onClick={() => actions.current?.rotate()} className={`rounded p-2 ${rotating ? "bg-sky-100 text-sky-800" : "hover:bg-gray-100"}`}><RotateCw className="h-4 w-4" /></button>
      <select aria-label="Vue du modèle" defaultValue="front" onChange={(event) => actions.current?.view(event.target.value)} className="min-h-8 rounded-md border px-2 text-sm"><option value="front">Face</option><option value="back">Arrière</option><option value="top">Dessus</option><option value="right">Droite</option></select>
    </div>
    <div className="relative min-h-0 flex-1"><div ref={host} className="absolute inset-0" />{loading && !error && <p role="status" className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm">Chargement du modèle…</p>}{error && <p role="alert" className="absolute inset-x-0 top-0 border-b border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div>
  </div>;
}