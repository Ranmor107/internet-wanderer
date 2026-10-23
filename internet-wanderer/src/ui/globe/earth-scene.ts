import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { globeCoordinates, globePoint, type NewsRegion } from './geography';
import { countryAt, countryRings } from './country-geography';

export interface EarthTarget { id: string; name: string; longitude: number; latitude: number; animate?: boolean; token: number }
export interface EarthApi { flyTo: (target: EarthTarget) => void; zoom: (direction: number) => void; reset: () => void; signals: (visible: boolean) => void; dispose: () => void }
interface Options {
  regions: NewsRegion[]; preview: boolean;
  ready: () => void; arrive: (target: EarthTarget) => void; interrupt: () => void;
  pick: (point: { id: string; name: string; longitude: number; latitude: number }) => void;
  error: () => void;
}

export function createEarth(host: HTMLDivElement, options: Options): EarthApi {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, options.preview ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x070f17, 0);
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', '可交互三维地球，拖动旋转，滚轮或双指缩放，点击国家查看新闻');
  canvas.setAttribute('role', 'img'); canvas.tabIndex = 0;
  host.appendChild(canvas);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, .05, 50);
  camera.position.fromArray(globePoint(45, 24, options.preview ? 3.5 : 3.35));
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false; controls.enableDamping = true; controls.dampingFactor = .09;
  controls.rotateSpeed = .55; controls.zoomSpeed = .8;
  controls.minDistance = 1.35; controls.maxDistance = 5.5;
  controls.enableZoom = !options.preview;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false, frame = 0, visible = true;
  let globalDistance = options.preview ? 3.5 : 3.35;
  let flight: { start: number; from: THREE.Vector3; to: THREE.Vector3; target: EarthTarget; duration: number } | undefined;
  let selected: THREE.LineSegments | undefined;
  let arrivalStart = 0;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  function sphere(radius: number, material: THREE.Material) {
    const geometry = new THREE.SphereGeometry(radius, options.preview ? 96 : 256, options.preview ? 64 : 128);
    geometries.push(geometry); materials.push(material);
    const mesh = new THREE.Mesh(geometry, material); scene.add(mesh); return mesh;
  }
  const surface = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .92, metalness: 0 });
  const earth = sphere(1, surface);
  scene.add(new THREE.HemisphereLight(0xbad8f2, 0x102439, 1.5));
  const sunlight = new THREE.DirectionalLight(0xfff5df, 3.4);
  scene.add(sunlight);
  const atmosphere = new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 vNormal; varying vec3 vView; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); vNormal=normalize(normalMatrix*normal); vView=normalize(-p.xyz); gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 vNormal; varying vec3 vView; void main(){float rim=pow(max(0.0,1.0+dot(normalize(vNormal),normalize(vView))),3.5);gl_FragColor=vec4(vec3(0.18,0.46,0.65)*rim,0.28*rim);}',
  });
  sphere(1.012, atmosphere);
  // A second, thin scattering layer gives the lit limb a visible blue edge.
  const limb = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: 'varying vec3 n; varying vec3 v; void main(){vec4 p=modelViewMatrix*vec4(position,1.0); n=normalize(normalMatrix*normal); v=normalize(-p.xyz); gl_Position=projectionMatrix*p;}',
    fragmentShader: 'varying vec3 n; varying vec3 v; void main(){float edge=pow(1.0-max(0.0,dot(normalize(n),normalize(v))),5.0); gl_FragColor=vec4(0.23,0.55,0.85,edge*0.20);}',
  });
  sphere(1.003, limb);
  const routeGeometry = new THREE.BufferGeometry();
  const routeMaterial = new THREE.LineBasicMaterial({ color: 0xf0d59d, transparent: true, opacity: .65 });
  const route = new THREE.Line(routeGeometry, routeMaterial); route.visible = false; scene.add(route);
  const beaconGeometry = new THREE.RingGeometry(.035, .039, 64);
  const beaconMaterial = new THREE.MeshBasicMaterial({ color: 0xffdf9b, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(beaconGeometry, beaconMaterial); beacon.visible = false; scene.add(beacon);
  geometries.push(routeGeometry, beaconGeometry); materials.push(routeMaterial, beaconMaterial);
  function receive(target: EarthTarget) {
    route.visible = false; host.style.setProperty('--flight-progress', '1');
    beacon.position.fromArray(globePoint(target.longitude, target.latitude, 1.008));
    beacon.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), beacon.position.clone().normalize());
    arrivalStart = reduced.matches ? 0 : performance.now(); beacon.visible = !reduced.matches;
    options.arrive(target);
  }
  const texture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}earth/day.jpg`, result => {
    if (disposed) { result.dispose(); return; }
    result.colorSpace = THREE.SRGBColorSpace; result.anisotropy = renderer.capabilities.getMaxAnisotropy();
    host.dataset.textureWidth = '2048';
    surface.map = result; surface.needsUpdate = true; options.ready(); invalidate();
    if (!options.preview && renderer.capabilities.maxTextureSize >= 4096) {
      const width = renderer.capabilities.maxTextureSize >= 8192 ? 8192 : 4096;
      const detail = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}earth/day-${width}.jpg`, high => {
        if (disposed) { high.dispose(); return; }
        high.colorSpace = THREE.SRGBColorSpace; high.anisotropy = renderer.capabilities.getMaxAnisotropy();
        surface.map = high; surface.needsUpdate = true; host.dataset.textureWidth = String(width);
        result.dispose(); invalidate();
      }, undefined, () => { /* The usable base map remains if the detail download fails. */ });
      textures.push(detail);
    }
  }, undefined, () => { if (!disposed) options.error(); });
  textures.push(texture);
  const pinLayer = document.createElement('div'); pinLayer.className = 'earth-pin-layer'; host.appendChild(pinLayer);
  const pins = options.regions.map(region => {
    const button = document.createElement('button'); button.className = 'earth-pin';
    button.dataset.region = region.id;
    button.setAttribute('aria-label', `探索${region.name}：${region.items.length}条地区新闻`);
    const dot = document.createElement('i'), label = document.createElement('span');
    label.textContent = region.name; button.append(dot, label);
    button.addEventListener('click', () => options.pick(region)); pinLayer.appendChild(button);
    return { button, point: new THREE.Vector3(...globePoint(region.longitude, region.latitude, 1.012)) };
  });
  let showSignals = true;
  function markCountry(id: string) {
    if (selected) { scene.remove(selected); selected.geometry.dispose(); (selected.material as THREE.Material).dispose(); selected = undefined; }
    const vertices: number[] = [];
    for (const ring of countryRings(id)) for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i];
      if (Math.abs(a[0] - b[0]) > 180) continue;
      const steps = Math.max(1, Math.ceil(Math.hypot(a[0] - b[0], a[1] - b[1])));
      for (let j = 0; j < steps; j++) for (const t of [j / steps, (j + 1) / steps]) vertices.push(...globePoint(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 1.003));
    }
    if (vertices.length) {
      selected = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)), new THREE.LineBasicMaterial({ color: 0xf3d48c, transparent: true, opacity: .9 }));
      scene.add(selected);
    }
    pins.forEach(({ button }) => button.setAttribute('aria-pressed', String(button.dataset.region === id)));
  }
  function stopFlight() {
    route.visible = false; beacon.visible = false; arrivalStart = 0;
    if (flight) { flight = undefined; options.interrupt(); }
  }
  controls.addEventListener('start', stopFlight);
  controls.addEventListener('change', invalidate);
  controls.addEventListener('end', invalidate);
  let down = { x: 0, y: 0 }, moved = false;
  const pointers = new Set<number>();
  const pointerDown = (event: PointerEvent) => { pointers.add(event.pointerId); if (pointers.size > 1) moved = true; else { down = { x: event.clientX, y: event.clientY }; moved = false; } };
  const pointerMove = (event: PointerEvent) => { if (Math.hypot(event.clientX - down.x, event.clientY - down.y) > 6) moved = true; };
  const raycaster = new THREE.Raycaster();
  const pointerUp = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (moved || options.preview || event.button !== 0) return;
    const bounds = canvas.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    const intersection = raycaster.intersectObject(earth)[0];
    if (!intersection) return;
    const point = globeCoordinates(intersection.point.x, intersection.point.y, intersection.point.z);
    const country = countryAt(point.longitude, point.latitude);
    if (country) options.pick({ ...point, id: country.code, name: country.name });
  };
  const keyDown = (event: KeyboardEvent) => {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', 'Home'].includes(event.key)) {
      event.preventDefault(); stopFlight();
      if (event.key === 'Home') api.reset();
      else if (event.key === '+' || event.key === '=') api.zoom(1);
      else if (event.key === '-') api.zoom(-1);
      else {
        const point = globeCoordinates(camera.position.x, camera.position.y, camera.position.z);
        camera.position.fromArray(globePoint(point.longitude + (event.key === 'ArrowLeft' ? -12 : event.key === 'ArrowRight' ? 12 : 0), Math.max(-82, Math.min(82, point.latitude + (event.key === 'ArrowUp' ? 10 : event.key === 'ArrowDown' ? -10 : 0))), camera.position.length()));
        controls.update(); invalidate();
      }
    }
  };
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp); canvas.addEventListener('pointercancel', () => { moved = true; pointers.clear(); });
  canvas.addEventListener('keydown', keyDown);
  canvas.addEventListener('webglcontextlost', contextLost);
  function contextLost(event: Event) { event.preventDefault(); options.error(); }
  const normal = new THREE.Vector3(), toCamera = new THREE.Vector3(), projected = new THREE.Vector3();
  function draw(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    if (flight) {
      const f = flight, t = Math.min(1, (now - f.start) / f.duration), ease = t * t * t * (t * (t * 6 - 15) + 10);
      const from = f.from.clone().normalize(), to = f.to.clone().normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(from, to);
      const direction = from.applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), rotation, ease));
      const radius = THREE.MathUtils.lerp(f.from.length(), f.to.length(), ease) + Math.sin(Math.PI * t) * .65;
      camera.position.copy(direction.multiplyScalar(radius)); controls.update();
      routeGeometry.setDrawRange(0, Math.max(2, Math.ceil(ease * 97)));
      routeMaterial.opacity = .65 * Math.sin(Math.PI * t);
      host.style.setProperty('--flight-progress', String(ease));
      if (t === 1) { flight = undefined; receive(f.target); }
    }
    if (arrivalStart) {
      const t = Math.min(1, (now - arrivalStart) / 1400);
      beacon.scale.setScalar(1 + t * 3); beaconMaterial.opacity = .8 * (1 - t) ** 2;
      if (t === 1) { arrivalStart = 0; beacon.visible = false; }
    }
    const changing = controls.update();
    sunlight.position.copy(camera.position).normalize().multiplyScalar(2).add(new THREE.Vector3(-3, 2, 1));
    renderer.render(scene, camera);
    const width = host.clientWidth, height = host.clientHeight;
    for (const { button, point } of pins) {
      const front = normal.copy(point).normalize().dot(toCamera.copy(camera.position).sub(point).normalize()) > .05;
      projected.copy(point).project(camera);
      const x = (projected.x + 1) / 2 * width, y = (-projected.y + 1) / 2 * height;
      const onScreen = front && projected.z < 1 && x > 22 && x < width - 22 && y > 22 && y < height - 22 && showSignals;
      button.hidden = !onScreen;
      button.dataset.edge = x > width - 90 ? 'left' : 'right';
      if (onScreen) button.style.transform = `translate(${x}px,${y}px) translate(-50%,-50%)`;
    }
    const location = globeCoordinates(camera.position.x, camera.position.y, camera.position.z);
    host.dataset.longitude = location.longitude.toFixed(2); host.dataset.latitude = location.latitude.toFixed(2);
    host.dataset.distance = camera.position.length().toFixed(3);
    if (flight || changing || arrivalStart) invalidate();
  }
  function invalidate() { if (!frame && !disposed && visible && !document.hidden) frame = requestAnimationFrame(draw); }
  function resize() {
    const width = host.clientWidth, height = host.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height); camera.aspect = width / height;
    const halfField = Math.atan(Math.tan(camera.fov * Math.PI / 360) * Math.min(1, camera.aspect));
    const fit = options.preview ? 3.5 : Math.max(3.35, 1.08 / Math.sin(halfField));
    camera.position.multiplyScalar(fit / globalDistance); globalDistance = fit;
    controls.maxDistance = Math.max(5.5, fit * 1.3);
    if (!options.preview && width > 760) camera.setViewOffset(width, height, -Math.min(150, width * .1), 0, width, height);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix(); invalidate();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
  const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) invalidate(); }); observer.observe(host);
  const visibilityChange = () => { if (!document.hidden) invalidate(); }; document.addEventListener('visibilitychange', visibilityChange);
  const reduceMotion = () => {
    if (reduced.matches) {
      arrivalStart = 0; beacon.visible = false;
      if (flight) { camera.position.copy(flight.to); const target = flight.target; flight = undefined; controls.update(); receive(target); }
      invalidate();
    }
  }; reduced.addEventListener('change', reduceMotion);
  const api: EarthApi = {
    flyTo(target) {
      markCountry(target.id);
      const to = new THREE.Vector3(...globePoint(target.longitude, target.latitude, options.preview ? 3.5 : Math.max(2.6, globalDistance * .6)));
      // Flush residual drag velocity before taking over from the current camera.
      controls.enableDamping = false; controls.update(); controls.enableDamping = true;
      arrivalStart = 0; beacon.visible = false;
      if (reduced.matches || target.animate === false) { flight = undefined; camera.position.copy(to); controls.update(); receive(target); }
      else {
        const from = camera.position.clone();
        const origin = from.clone().normalize(), destination = to.clone().normalize();
        const angle = origin.angleTo(destination), rotation = new THREE.Quaternion().setFromUnitVectors(origin, destination);
        const points = Array.from({ length: 97 }, (_, index) => {
          const t = index / 96;
          return origin.clone().applyQuaternion(new THREE.Quaternion().slerpQuaternions(new THREE.Quaternion(), rotation, t)).multiplyScalar(1.012 + Math.sin(t * Math.PI) * Math.min(.22, angle * .12));
        });
        routeGeometry.setFromPoints(points); routeGeometry.computeBoundingSphere(); routeGeometry.setDrawRange(0, 0); route.visible = true;
        host.style.setProperty('--flight-progress', '0');
        flight = { from, to, target, start: performance.now(), duration: 1100 + Math.min(1100, angle * 500) };
      }
      invalidate();
    },
    zoom(direction) { stopFlight(); camera.position.setLength(THREE.MathUtils.clamp(camera.position.length() * (direction > 0 ? .82 : 1.22), controls.minDistance, controls.maxDistance)); controls.update(); invalidate(); },
    reset() { stopFlight(); markCountry(''); camera.position.setLength(globalDistance); controls.update(); invalidate(); },
    signals(value) { showSignals = value; invalidate(); },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); resizeObserver.disconnect(); observer.disconnect();
      document.removeEventListener('visibilitychange', visibilityChange); reduced.removeEventListener('change', reduceMotion);
      controls.dispose(); canvas.removeEventListener('keydown', keyDown); canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove); canvas.removeEventListener('pointerup', pointerUp); canvas.removeEventListener('webglcontextlost', contextLost);
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
      if (selected) { selected.geometry.dispose(); (selected.material as THREE.Material).dispose(); }
      renderer.dispose(); renderer.forceContextLoss(); canvas.remove(); pinLayer.remove();
    },
  };
  resize(); controls.update(); invalidate();
  return api;
}
