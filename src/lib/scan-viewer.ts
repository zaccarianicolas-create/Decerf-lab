import * as THREE from "three";

export function centerScanModel(object: THREE.Object3D) {
  const group = new THREE.Group();
  group.add(object);
  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const maximum = Math.max(size.x, size.y, size.z);
  if (box.isEmpty() || !Number.isFinite(maximum) || maximum <= 0) throw new Error("Le fichier ne contient pas de géométrie 3D exploitable.");
  object.position.sub(box.getCenter(new THREE.Vector3()));
  group.scale.setScalar(70 / maximum);
  group.updateMatrixWorld(true);
  return group;
}

export function scanCameraDistance(camera: THREE.PerspectiveCamera) {
  const vertical = THREE.MathUtils.degToRad(camera.fov);
  const horizontal = 2 * Math.atan(Math.tan(vertical / 2) * camera.aspect);
  return 55 / Math.tan(Math.min(vertical, horizontal) / 2);
}