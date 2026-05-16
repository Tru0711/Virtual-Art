/**
 * AR Artwork Viewer
 * WebXR AR (mobile) + 3D Preview (laptop/desktop) - Three.js
 * Supports artwork dimensions for proper wall scaling
 */

// Load Three/OrbitControls dynamically and reuse existing instance if present
let THREE = window.THREE;
let OrbitControls = window.OrbitControls;

(async () => {
  if (!THREE) {
    const m = await import('https://cdn.jsdelivr.net/npm/three@0.184.0/build/three.module.js');
    THREE = m;
    window.THREE = THREE;
  }
  if (!OrbitControls) {
    const c = await import('https://cdn.jsdelivr.net/npm/three@0.184.0/examples/jsm/controls/OrbitControls.js');
    OrbitControls = c.OrbitControls;
    window.OrbitControls = OrbitControls;
  }

  // ----- Config -----
  const DEFAULT_IMAGE = 'https://images.pexels.com/photos/1266808/pexels-photo-1266808.jpeg';
const DEFAULT_WIDTH = 24; // inches
const DEFAULT_HEIGHT = 18; // inches
const BASE_SCALE = 0.6;
const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const SCALE_STEP = 0.1;

// Inches to meters conversion (for AR)
const INCHES_TO_METERS = 0.0254;

// ----- State -----
let camera, scene, renderer;
let reticle, artworkMesh;
let hitTestSource = null;
let hitTestSourceRequested = false;
let xrSession = null;
let xrRefSpace = null;
let currentScale = 1;
let repositionMode = false;
let orbitControls = null;
let isDesktop3DMode = false;

// Artwork dimensions
let artworkWidth = DEFAULT_WIDTH;
let artworkHeight = DEFAULT_HEIGHT;

// ----- Utilities -----
function getImageUrl() {
  const params = new URLSearchParams(window.location.search);
  const img = params.get('img');
  if (img) {
    try {
      const decoded = decodeURIComponent(img);
      if (decoded.startsWith('http://') || decoded.startsWith('https://')) {
        return decoded;
      }
      const base = window.location.origin;
      return decoded.startsWith('/') ? base + decoded : base + '/' + decoded;
    } catch (err) {
      console.warn('[AR Viewer] Failed to decode image URL:', err);
      return DEFAULT_IMAGE;
    }
  }
  return DEFAULT_IMAGE;
}

function getArtworkDimensions() {
  const params = new URLSearchParams(window.location.search);
  const width = parseFloat(params.get('width')) || DEFAULT_WIDTH;
  const height = parseFloat(params.get('height')) || DEFAULT_HEIGHT;
  return { width, height };
}

function getDeviceType() {
  const params = new URLSearchParams(window.location.search);
  return params.get('device') || 'auto';
}

/**
 * Create texture with watermark baked in.
 */
async function createWatermarkedTexture(imageUrl) {
  return new Promise((resolve, reject) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      imageUrl,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn('[AR Viewer] Texture load failed, trying fallback:', err);
        const fallbackUrl = imageUrl === DEFAULT_IMAGE ? DEFAULT_IMAGE : DEFAULT_IMAGE;
        if (imageUrl !== fallbackUrl) {
          loader.load(
            fallbackUrl,
            (fallbackTex) => {
              fallbackTex.colorSpace = THREE.SRGBColorSpace;
              fallbackTex.flipY = false;
              resolve(fallbackTex);
            },
            undefined,
            () => {
              addClientWatermark(fallbackUrl).then(resolve).catch(() => {
                console.error('[AR Viewer] All image loading methods failed');
                reject(new Error('Failed to load artwork image'));
              });
            }
          );
        } else {
          addClientWatermark(imageUrl).then(resolve).catch(() => {
            console.error('[AR Viewer] All image loading methods failed');
            reject(new Error('Failed to load artwork image'));
          });
        }
      }
    );
  });
}

/**
 * Fallback: composite diagonal watermark onto image via canvas
 */
function addClientWatermark(imageUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 4);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        ctx.font = `bold ${Math.max(24, canvas.width / 20)}px Arial`;
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.lineWidth = 2;
        ctx.textAlign = 'center';
        const text = '© VisualArt - Protected';
        const step = canvas.width * 0.4;
        for (let y = -canvas.height; y < canvas.height * 2; y += step) {
          for (let x = -canvas.width; x < canvas.width * 2; x += step) {
            ctx.strokeText(text, x, y);
            ctx.fillText(text, x, y);
          }
        }
        ctx.restore();
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false;
        resolve(tex);
      } catch (err) {
        console.error('[AR Viewer] Canvas watermark failed:', err);
        reject(err);
      }
    };
    img.onerror = (err) => {
      console.error('[AR Viewer] Image load failed in watermark function:', imageUrl, err);
      reject(new Error(`Failed to load image: ${imageUrl}`));
    };
    img.src = imageUrl;
  });
}

// ----- Protection -----
function initProtection() {
  document.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('selectstart', (e) => e.preventDefault());
  document.addEventListener('copy', (e) => e.preventDefault());
  document.addEventListener('cut', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 's') e.preventDefault();
    if (e.ctrlKey && e.shiftKey && e.key === 'I') e.preventDefault();
    if (e.ctrlKey && e.key === 'u') e.preventDefault();
    if (e.key === 'PrintScreen') e.preventDefault();
  });

  document.addEventListener('visibilitychange', () => {
    const overlay = document.getElementById('blurOverlay');
    if (!overlay) return;
    overlay.hidden = document.visibilityState === 'visible';
  });

  if ('captureEvents' in document) {
    try {
      document.captureEvents(Event.CLICK);
    } catch (_) {}
  }
}

// ----- Desktop 3D Preview -----
async function initDesktop3D(imageUrl) {
  const container = document.getElementById('canvasContainer');
  document.getElementById('preAR').hidden = true;
  document.getElementById('inAR').hidden = false;
  document.getElementById('desktopInstructions').hidden = false;
  isDesktop3DMode = true;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);

  camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 2.5);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.enableDamping = true;
  orbitControls.dampingFactor = 0.05;
  orbitControls.minDistance = 0.5;
  orbitControls.maxDistance = 6;
  orbitControls.maxPolarAngle = Math.PI / 2 + 0.3;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
  dirLight.position.set(2, 3, 4);
  scene.add(dirLight);

  const texture = await createWatermarkedTexture(imageUrl);
  const aspect = texture.image ? texture.image.width / texture.image.height : artworkWidth / artworkHeight;
  
  // Scale based on artwork dimensions
  const widthMeters = artworkWidth * INCHES_TO_METERS;
  const heightMeters = artworkHeight * INCHES_TO_METERS;
  
  // Create artwork plane with real dimensions (scaled for view)
  const planeGeom = new THREE.PlaneGeometry(BASE_SCALE * aspect, BASE_SCALE);
  const planeMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true
  });
  artworkMesh = new THREE.Mesh(planeGeom, planeMat);
  artworkMesh.position.z = -0.01;
  artworkMesh.scale.setScalar(currentScale);
  
  // Store real dimensions for reference
  artworkMesh.userData.realWidth = widthMeters;
  artworkMesh.userData.realHeight = heightMeters;
  
  scene.add(artworkMesh);

  // Create wall with dimensions hint
  const wallWidth = Math.max(4, widthMeters * 3);
  const wallHeight = Math.max(4, heightMeters * 3);
  const wallGeom = new THREE.PlaneGeometry(wallWidth, wallHeight);
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x2d3748, side: THREE.DoubleSide });
  const wall = new THREE.Mesh(wallGeom, wallMat);
  wall.position.z = -0.5;
  scene.add(wall);

  // Create frame with artwork dimensions
  const frameWidth = BASE_SCALE * aspect + 0.08;
  const frameHeight = BASE_SCALE + 0.08;
  const frameGeom = new THREE.BoxGeometry(frameWidth, frameHeight, 0.04);
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x4a5568 });
  const frame = new THREE.Mesh(frameGeom, frameMat);
  frame.position.copy(artworkMesh.position);
  frame.position.z -= 0.02;
  frame.scale.copy(artworkMesh.scale);
  scene.add(frame);

  function animate() {
    if (!isDesktop3DMode) return;
    requestAnimationFrame(animate);
    orbitControls.update();
    if (artworkMesh) {
      frame.scale.copy(artworkMesh.scale);
    }
    renderer.render(scene, camera);
  }
  animate();

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);
  window.desktop3DCleanup = () => {
    isDesktop3DMode = false;
    window.removeEventListener('resize', onResize);
    if (orbitControls) {
      orbitControls.dispose();
      orbitControls = null;
    }
    if (renderer && renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    if (renderer) renderer.dispose();
  };
}

// ----- AR Setup -----
async function init() {
  // Get artwork dimensions from URL params
  const dimensions = getArtworkDimensions();
  artworkWidth = dimensions.width;
  artworkHeight = dimensions.height;
  
  console.log('[AR Viewer] Artwork dimensions:', artworkWidth, 'x', artworkHeight, 'inches');

  const container = document.getElementById('canvasContainer');
  const preAR = document.getElementById('preAR');
  const enterARBtn = document.getElementById('enterAR');
  const enter3DBtn = document.getElementById('enter3D');
  const statusEl = document.getElementById('arStatus');
  const modeDesc = document.getElementById('modeDescription');
  const previewImg = document.getElementById('previewImg');

  initProtection();

  let imageUrl = getImageUrl();
  let imageLoadFailed = false;
  
  previewImg.onerror = () => {
    console.warn('[AR Viewer] Image load failed, using fallback:', imageUrl);
    imageLoadFailed = true;
    imageUrl = DEFAULT_IMAGE;
    previewImg.src = DEFAULT_IMAGE;
    statusEl.textContent = 'Using default preview image.';
    statusEl.classList.remove('error');
  };
  
  previewImg.onload = () => {
    if (!imageLoadFailed) {
      statusEl.textContent = `Image loaded. Artwork: ${artworkWidth}" × ${artworkHeight}"`;
    }
  };
  
  previewImg.src = imageUrl;

  let arSupported = false;
  const deviceType = getDeviceType();
  
  if (deviceType === 'mobile') {
    // Force mobile/AR mode
    modeDesc.textContent = `AR Mode: ${artworkWidth}" × ${artworkHeight}" artwork. Point your device at a wall and tap to place.`;
    statusEl.textContent = 'Tap to start AR preview';
    statusEl.classList.add('ready');
    enterARBtn.disabled = false;
    
    if (typeof navigator !== 'undefined' && navigator.xr) {
      try {
        arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      } catch (_) {}
    }
    
    if (arSupported) {
      enterARBtn.addEventListener('click', async () => {
        try {
          const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['plane-detection', 'dom-overlay'],
            domOverlay: { root: document.body }
          });
          await onSessionStarted(session, imageUrl);
          preAR.hidden = true;
          document.getElementById('inAR').hidden = false;
          xrSession = session;
        } catch (err) {
          console.error('XR session failed:', err);
          statusEl.textContent = 'Could not start AR: ' + (err.message || 'Unknown error');
          statusEl.classList.add('error');
        }
      });
    } else {
      // Fallback to 3D if AR not supported
      modeDesc.textContent = 'AR not supported on this device. Using 3D preview instead.';
      statusEl.textContent = 'AR not available. Starting 3D preview...';
      enter3DBtn.hidden = false;
      enter3DBtn.disabled = false;
      enter3DBtn.addEventListener('click', async () => {
        try {
          await initDesktop3D(imageUrl);
        } catch (err) {
          console.error('[AR Viewer] Failed to initialize 3D preview:', err);
          statusEl.textContent = 'Failed to load 3D preview.';
          statusEl.classList.add('error');
        }
      });
    }
  } else if (deviceType === 'desktop') {
    // Force desktop/3D mode
    modeDesc.textContent = `3D Preview: ${artworkWidth}" × ${artworkHeight}" artwork on virtual wall.`;
    statusEl.textContent = 'Click to start 3D preview';
    statusEl.classList.add('ready');
    enter3DBtn.hidden = false;
    enter3DBtn.disabled = false;
    enter3DBtn.addEventListener('click', async () => {
      try {
        await initDesktop3D(imageUrl);
      } catch (err) {
        console.error('[AR Viewer] Failed to initialize 3D preview:', err);
        statusEl.textContent = 'Failed to load 3D preview.';
        statusEl.classList.add('error');
      }
    });
  } else {
    // Auto-detect mode
    if (typeof navigator !== 'undefined' && navigator.xr) {
      try {
        arSupported = await navigator.xr.isSessionSupported('immersive-ar');
      } catch (_) {}
    }

    if (arSupported) {
      document.getElementById('btnReposition').style.display = '';
      modeDesc.textContent = `Point your device at a wall and tap to place the ${artworkWidth}" × ${artworkHeight}" artwork.`;
      statusEl.textContent = 'AR ready. Tap to start.';
      statusEl.classList.add('ready');
      enterARBtn.disabled = false;
      enterARBtn.addEventListener('click', async () => {
        try {
          const session = await navigator.xr.requestSession('immersive-ar', {
            requiredFeatures: ['hit-test'],
            optionalFeatures: ['plane-detection', 'dom-overlay'],
            domOverlay: { root: document.body }
          });
          await onSessionStarted(session, imageUrl);
          preAR.hidden = true;
          document.getElementById('inAR').hidden = false;
          xrSession = session;
        } catch (err) {
          console.error('XR session failed:', err);
          statusEl.textContent = 'Could not start AR: ' + (err.message || 'Unknown error');
          statusEl.classList.add('error');
        }
      });
    } else {
      document.getElementById('btnReposition').style.display = 'none';
      modeDesc.textContent = `3D Preview: See how the ${artworkWidth}" × ${artworkHeight}" artwork looks on a virtual wall.`;
      statusEl.textContent = 'AR requires a mobile device. Use 3D Preview on laptop/desktop.';
      statusEl.classList.add('ready');
      enter3DBtn.hidden = false;
      enter3DBtn.disabled = false;
      enter3DBtn.addEventListener('click', async () => {
        try {
          await initDesktop3D(imageUrl);
        } catch (err) {
          console.error('[AR Viewer] Failed to initialize 3D preview:', err);
          statusEl.textContent = 'Failed to load 3D preview. Please check the image URL.';
          statusEl.classList.add('error');
        }
      });
    }
  }

  document.getElementById('exitAR').addEventListener('click', () => {
    if (isDesktop3DMode && window.desktop3DCleanup) {
      window.desktop3DCleanup();
      document.getElementById('preAR').hidden = false;
      document.getElementById('inAR').hidden = true;
      document.getElementById('desktopInstructions').hidden = true;
    } else {
      endSession();
    }
  });
  document.getElementById('btnScaleDown').addEventListener('click', () => adjustScale(-SCALE_STEP));
  document.getElementById('btnScaleUp').addEventListener('click', () => adjustScale(SCALE_STEP));
  document.getElementById('btnReposition').addEventListener('click', () => {
    if (isDesktop3DMode) return;
    repositionMode = true;
    if (artworkMesh) {
      scene.remove(artworkMesh);
      artworkMesh = null;
    }
    if (reticle) reticle.visible = true;
  });
}

async function onSessionStarted(session, imageUrl) {
  const container = document.getElementById('canvasContainer');
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 100);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  container.appendChild(renderer.domElement);

  await renderer.xr.setSession(session);

  const refSpace = await session.requestReferenceSpace('viewer');
  xrRefSpace = await session.requestReferenceSpace('local-floor');

  hitTestSourceRequested = false;
  hitTestSource = null;

  const controller = renderer.xr.getController(0);
  controller.addEventListener('select', onSelect);
  scene.add(controller);

  const reticleGeom = new THREE.RingGeometry(0.08, 0.12, 32).rotateX(-Math.PI / 2);
  const reticleMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
  reticle = new THREE.Mesh(reticleGeom, reticleMat);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;
  scene.add(reticle);

  session.addEventListener('end', onSessionEnded);

  const texture = await createWatermarkedTexture(imageUrl);
  const aspect = texture.image ? texture.image.width / texture.image.height : artworkWidth / artworkHeight;
  
  // Calculate artwork size in meters for AR
  const widthMeters = artworkWidth * INCHES_TO_METERS;
  const heightMeters = artworkHeight * INCHES_TO_METERS;
  
  // Create plane with actual artwork dimensions (scaled)
  const planeGeom = new THREE.PlaneGeometry(BASE_SCALE * aspect, BASE_SCALE);
  const planeMat = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 1
  });

  function createArtworkMesh() {
    const mesh = new THREE.Mesh(planeGeom.clone(), planeMat.clone());
    // Store real dimensions for scaling reference
    mesh.userData.realWidth = widthMeters;
    mesh.userData.realHeight = heightMeters;
    mesh.userData.aspectRatio = aspect;
    return mesh;
  }

  window.createArtworkMesh = createArtworkMesh;
  window.placeArtwork = (matrix) => {
    if (!artworkMesh) {
      artworkMesh = createArtworkMesh();
    }
    artworkMesh.matrix.fromArray(matrix);
    artworkMesh.matrix.decompose(artworkMesh.position, artworkMesh.quaternion, artworkMesh.scale);
    
    // Apply scale based on artwork dimensions
    const baseScale = Math.min(widthMeters, heightMeters) * 2;
    artworkMesh.scale.multiplyScalar(currentScale * baseScale);
    
    scene.add(artworkMesh);
    reticle.visible = false;
    repositionMode = false;
  };

  function getHitTestSource() {
    if (session.requestHitTestSourceForSpace) {
      return session.requestHitTestSourceForSpace(refSpace);
    }
    return session.requestHitTestSource({ space: refSpace });
  }

  function onXRFrame(time, frame) {
    if (!frame || !session) return;
    const refSpace = renderer.xr.getReferenceSpace();

    if (!hitTestSourceRequested) {
      getHitTestSource()
        .then((source) => { hitTestSource = source; })
        .catch((e) => console.warn('Hit-test source failed:', e));
      hitTestSourceRequested = true;
    }

    if (hitTestSource && (!artworkMesh || repositionMode)) {
      const hitResults = frame.getHitTestResults(hitTestSource);
      if (hitResults.length) {
        const hit = hitResults[0];
        const pose = hit.getPose(xrRefSpace || refSpace);
        if (pose) {
          reticle.visible = true;
          reticle.matrix.fromArray(pose.transform.matrix);
        }
      } else if (!repositionMode) {
        reticle.visible = false;
      }
    }

    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(onXRFrame);
  window.addEventListener('resize', onResize);
}

function onSelect() {
  if (reticle.visible && hitTestSource) {
    if (artworkMesh && !repositionMode) return;
    if (repositionMode || !artworkMesh) {
      window.placeArtwork(Array.from(reticle.matrix.elements));
      updateScaleLabel();
    }
  }
}

function adjustScale(delta) {
  currentScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, currentScale + delta));
  if (artworkMesh) {
    artworkMesh.scale.setScalar(currentScale);
  }
  updateScaleLabel();
}

function updateScaleLabel() {
  const el = document.getElementById('scaleLabel');
  if (el) el.textContent = Math.round(currentScale * 100) + '%';
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onSessionEnded() {
  hitTestSourceRequested = false;
  hitTestSource = null;
  xrSession = null;
  xrRefSpace = null;
  if (hitTestSource && hitTestSource.cancel) hitTestSource.cancel();
  renderer.setAnimationLoop(null);
  window.removeEventListener('resize', onResize);
  document.getElementById('preAR').hidden = false;
  document.getElementById('inAR').hidden = true;
}

async function endSession() {
  if (xrSession) {
    await xrSession.end();
  }
}

// ----- Start -----
init().catch((err) => {
  console.error('[AR Viewer] Initialization failed:', err);
  const statusEl = document.getElementById('arStatus');
  if (statusEl) {
    statusEl.textContent = 'Failed to initialize AR viewer: ' + (err.message || 'Unknown error');
    statusEl.classList.add('error');
  }
});

})();
