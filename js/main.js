/* Harshavardhan Shet — portfolio interactions
   Three.js hero particles · GSAP ScrollTrigger · Lenis smooth scroll */

import * as THREE from "three";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isMobile = window.matchMedia("(max-width: 900px)").matches;
if (reducedMotion) document.documentElement.classList.add("no-motion");

/* ============ Loading screen ============ */
(function bootLoader() {
  const loader = document.getElementById("loader");
  const lines = loader.querySelectorAll("[data-line]");
  const bar = document.getElementById("loader-progress");
  let i = 0;
  const step = () => {
    if (i < lines.length) {
      lines[i].classList.add("show");
      bar.style.width = `${Math.round(((i + 1) / lines.length) * 100)}%`;
      i += 1;
      setTimeout(step, reducedMotion ? 0 : 320);
    } else {
      setTimeout(() => loader.classList.add("done"), reducedMotion ? 0 : 350);
    }
  };
  step();
  // Safety: never trap the user behind the loader.
  setTimeout(() => loader.classList.add("done"), 4000);
})();

/* ============ Lenis smooth scroll ============ */
let lenis = null;
if (!reducedMotion && typeof Lenis !== "undefined" && typeof gsap !== "undefined") {
  lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
  lenis.on("scroll", () => ScrollTrigger.update());
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // Anchor links route through Lenis so pinned sections offset correctly.
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const target = document.querySelector(a.getAttribute("href"));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
      }
    });
  });
}

/* ============ Hero: Three.js particle neural network ============ */
(function neuralHero() {
  const canvas = document.getElementById("neural-canvas");
  if (!canvas || reducedMotion) return;

  const COUNT = isMobile ? 70 : 160;
  const RANGE = 22;
  const LINK_DIST = isMobile ? 5.5 : 6.5;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.z = 26;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas.parentElement;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener("resize", resize);

  // Nodes
  const positions = new Float32Array(COUNT * 3);
  const velocities = new Float32Array(COUNT * 3);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3] = (Math.random() - 0.5) * RANGE * 2;
    positions[i * 3 + 1] = (Math.random() - 0.5) * RANGE;
    positions[i * 3 + 2] = (Math.random() - 0.5) * RANGE * 0.6;
    velocities[i * 3] = (Math.random() - 0.5) * 0.012;
    velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.012;
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.006;
  }
  const nodeGeo = new THREE.BufferGeometry();
  nodeGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const nodeMat = new THREE.PointsMaterial({
    color: 0x00e5ff, size: 0.22, transparent: true, opacity: 0.9,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  scene.add(new THREE.Points(nodeGeo, nodeMat));

  // Synapses (line segments rebuilt each frame between nearby nodes)
  const maxLinks = COUNT * 6;
  const linkPositions = new Float32Array(maxLinks * 6);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPositions, 3));
  const linkMat = new THREE.LineBasicMaterial({
    color: 0x00e5ff, transparent: true, opacity: 0.16,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const links = new THREE.LineSegments(linkGeo, linkMat);
  scene.add(links);

  // Cursor reaction
  const mouse = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    mouse.x = (e.clientX / window.innerWidth - 0.5) * 2;
    mouse.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  const clock = new THREE.Clock();
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const dt = Math.min(clock.getDelta(), 0.05) * 60;

    for (let i = 0; i < COUNT; i++) {
      for (let a = 0; a < 3; a++) {
        positions[i * 3 + a] += velocities[i * 3 + a] * dt;
      }
      // soft bounds
      if (Math.abs(positions[i * 3]) > RANGE) velocities[i * 3] *= -1;
      if (Math.abs(positions[i * 3 + 1]) > RANGE * 0.6) velocities[i * 3 + 1] *= -1;
      if (Math.abs(positions[i * 3 + 2]) > RANGE * 0.4) velocities[i * 3 + 2] *= -1;
    }
    nodeGeo.attributes.position.needsUpdate = true;

    let li = 0;
    for (let i = 0; i < COUNT && li < maxLinks; i++) {
      for (let j = i + 1; j < COUNT && li < maxLinks; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < LINK_DIST * LINK_DIST) {
          linkPositions.set(
            [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
             positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]],
            li * 6
          );
          li++;
        }
      }
    }
    linkGeo.setDrawRange(0, li * 2);
    linkGeo.attributes.position.needsUpdate = true;

    // camera parallax toward cursor
    camera.position.x += (mouse.x * 3 - camera.position.x) * 0.04;
    camera.position.y += (-mouse.y * 2 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  });
})();

/* ============ Typewriter title rotation ============ */
(function typewriter() {
  const el = document.getElementById("typewriter");
  if (!el || reducedMotion) return;
  const titles = ["Generative AI Engineer", "Edge LLM Specialist", "On-Device AI", "Automotive AI"];
  let ti = 0, ci = titles[0].length, deleting = true;
  const tick = () => {
    const word = titles[ti];
    ci += deleting ? -1 : 1;
    el.textContent = word.slice(0, ci);
    let delay = deleting ? 40 : 75;
    if (!deleting && ci === word.length) { delay = 2200; deleting = true; }
    else if (deleting && ci === 0) { deleting = false; ti = (ti + 1) % titles.length; delay = 300; }
    setTimeout(tick, delay);
  };
  setTimeout(tick, 2400);
})();

/* ============ GSAP scroll choreography ============ */
const hasGsap = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
if (hasGsap) gsap.registerPlugin(ScrollTrigger);
if (!hasGsap) {
  // CDN failed — make sure nothing stays hidden.
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("revealed"));
  document.querySelectorAll("[data-scene]").forEach((s) => s.classList.add("active"));
  document.querySelectorAll(".stat-num").forEach((el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  });
}

if (hasGsap && !reducedMotion) {
  // Generic reveals
  document.querySelectorAll("[data-reveal]").forEach((el) => {
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.9, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" },
      onStart: () => el.classList.add("revealed"),
    });
  });

  // Stat counters
  document.querySelectorAll(".stat-num").forEach((el) => {
    const end = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || "";
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.6, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: () => { el.textContent = Math.round(obj.v) + suffix; },
    });
  });

  // Project scenes: cinematic entrance per scene + active state for SVG draws
  document.querySelectorAll("[data-scene]").forEach((scene) => {
    const visual = scene.querySelector(".scene-visual");
    const body = scene.querySelector(".scene-body");

    if (!isMobile) {
      gsap.fromTo(visual,
        { opacity: 0, scale: 0.85, rotateY: -18, y: 60 },
        {
          opacity: 1, scale: 1, rotateY: 0, y: 0, ease: "none",
          scrollTrigger: { trigger: scene, start: "top 90%", end: "top 35%", scrub: true },
        });
      gsap.fromTo(body.children,
        { opacity: 0, y: 50 },
        {
          opacity: 1, y: 0, stagger: 0.08, ease: "none",
          scrollTrigger: { trigger: scene, start: "top 80%", end: "top 30%", scrub: true },
        });
      // subtle parallax exit
      gsap.to(visual, {
        y: -60, ease: "none",
        scrollTrigger: { trigger: scene, start: "bottom 70%", end: "bottom 10%", scrub: true },
      });
    } else {
      gsap.from(scene, {
        opacity: 0, y: 40, duration: 0.8, ease: "power2.out",
        scrollTrigger: { trigger: scene, start: "top 85%" },
      });
    }

    ScrollTrigger.create({
      trigger: scene, start: "top 60%",
      onEnter: () => scene.classList.add("active"),
    });
  });

} else if (hasGsap) {
  // Reduced motion: static final states.
  document.querySelectorAll("[data-scene]").forEach((s) => s.classList.add("active"));
  document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("revealed"));
  document.querySelectorAll(".stat-num").forEach((el) => {
    el.textContent = el.dataset.count + (el.dataset.suffix || "");
  });
}

/* ============ Tilt cards ============ */
if (!reducedMotion && !isMobile) {
  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (e) => {
      const r = card.getBoundingClientRect();
      const rx = ((e.clientY - r.top) / r.height - 0.5) * -8;
      const ry = ((e.clientX - r.left) / r.width - 0.5) * 8;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    card.addEventListener("pointerleave", () => { card.style.transform = ""; });
  });
}

/* ============ Magnetic buttons ============ */
if (!reducedMotion && !isMobile) {
  document.querySelectorAll("[data-magnetic]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.35;
      el.style.transform = `translate(${x}px, ${y}px)`;
    });
    el.addEventListener("pointerleave", () => { el.style.transform = ""; });
  });
}

/* ============ Skills constellation (canvas, 3D-projected orbits) ============ */
(function skillsConstellation() {
  const canvas = document.getElementById("skills-canvas");
  if (!canvas) return;

  const GROUPS = [
    { name: "Languages", items: ["Python", "C++", "Java"] },
    { name: "Frameworks", items: ["PyTorch", "TensorFlow", "HuggingFace", "llama.cpp", "LangChain", "LangGraph", "OpenCV", "Pandas", "NumPy", "CUDA"] },
    { name: "LLM & AI", items: ["fine-tuning", "Agentic AI", "RAG", "PageIndexing", "prompt eng.", "INT4/INT8", "ONNX", "TensorRT", "segmentation"] },
    { name: "Edge & HW", items: ["Jetson Orin", "DRIVE AGX", "DGX", "HDK8650"] },
    { name: "Tools", items: ["Docker", "Git", "VS Code", "Jupyter", "Django", "SQL", "Linux", "DeepStream", "SNPE", "QNN", "Genie SDK"] },
  ];
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = Math.min(window.devicePixelRatio, 2);

  const resize = () => {
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener("resize", resize);

  // Build nodes: each group on its own orbital shell
  const nodes = [];
  GROUPS.forEach((g, gi) => {
    const radius = 0.35 + gi * 0.16;
    g.items.forEach((label, i) => {
      const phi = (i / g.items.length) * Math.PI * 2;
      const tiltA = gi * 0.55;
      nodes.push({ group: gi, label, radius, phi, tilt: tiltA });
    });
  });

  let hotGroup = -1;
  const legend = document.getElementById("skills-legend");
  legend.querySelectorAll(".skill-group").forEach((el) => {
    el.addEventListener("pointerenter", () => { hotGroup = +el.dataset.group; });
    el.addEventListener("pointerleave", () => { hotGroup = -1; });
  });

  // Scroll-driven group pulse
  let pulseGroup = 0;
  if (!reducedMotion) {
    setInterval(() => { pulseGroup = (pulseGroup + 1) % GROUPS.length; }, 2000);
  }

  let t = 0;
  let visible = true;
  new IntersectionObserver(([e]) => (visible = e.isIntersecting)).observe(canvas);

  const draw = () => {
    requestAnimationFrame(draw);
    if (!visible || !W) return;
    t += reducedMotion ? 0 : 0.004;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, scale = Math.min(W, H) / 2;

    // center core
    const coreGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.18);
    coreGrad.addColorStop(0, "rgba(0,229,255,0.35)");
    coreGrad.addColorStop(1, "rgba(0,229,255,0)");
    ctx.fillStyle = coreGrad;
    ctx.fillRect(cx - scale * 0.2, cy - scale * 0.2, scale * 0.4, scale * 0.4);

    const projected = nodes.map((n) => {
      const a = n.phi + t * (1 + n.group * 0.18);
      let x = Math.cos(a) * n.radius;
      let z = Math.sin(a) * n.radius;
      let y = Math.sin(a * 1.3 + n.group) * 0.06;
      // tilt each shell differently
      const ct = Math.cos(n.tilt), st = Math.sin(n.tilt);
      const y2 = y * ct - z * st;
      const z2 = y * st + z * ct;
      const depth = 1 / (1.6 - z2);
      return { n, sx: cx + x * scale * depth, sy: cy + y2 * scale * depth, depth };
    });

    // links to same-group neighbors
    ctx.lineWidth = 1;
    GROUPS.forEach((g, gi) => {
      const pts = projected.filter((p) => p.n.group === gi);
      const active = hotGroup === gi || (hotGroup === -1 && pulseGroup === gi);
      ctx.strokeStyle = active ? "rgba(0,229,255,0.4)" : "rgba(0,229,255,0.10)";
      ctx.beginPath();
      pts.forEach((p, i) => {
        const q = pts[(i + 1) % pts.length];
        ctx.moveTo(p.sx, p.sy); ctx.lineTo(q.sx, q.sy);
      });
      ctx.stroke();
    });

    projected.sort((a, b) => a.depth - b.depth);
    projected.forEach((p) => {
      const active = hotGroup === p.n.group || (hotGroup === -1 && pulseGroup === p.n.group);
      const r = (active ? 3.4 : 2.2) * p.depth;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fillStyle = active ? "#00E5FF" : "rgba(0,229,255,0.45)";
      ctx.shadowColor = "#00E5FF";
      ctx.shadowBlur = active ? 12 : 0;
      ctx.fill();
      ctx.shadowBlur = 0;
      if (active && p.depth > 0.62) {
        ctx.fillStyle = "rgba(237,239,244,0.9)";
        ctx.font = `${10 * p.depth + 2}px "JetBrains Mono", monospace`;
        ctx.textAlign = "center";
        ctx.fillText(p.n.label, p.sx, p.sy - 8 * p.depth);
      }
    });

    // sync legend highlight with pulse
    legend.querySelectorAll(".skill-group").forEach((el) => {
      el.classList.toggle("hot", hotGroup === -1 && +el.dataset.group === pulseGroup);
    });
  };
  draw();
})();

/* ============ Contact terminal typing ============ */
(function contactTerminal() {
  const el = document.getElementById("contact-typed");
  if (!el) return;
  const text = "initialize_contact()";
  if (reducedMotion) { el.textContent = text; return; }
  let started = false;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !started) {
      started = true;
      let i = 0;
      const tick = () => {
        el.textContent = text.slice(0, ++i);
        if (i < text.length) setTimeout(tick, 70);
      };
      tick();
    }
  }, { threshold: 0.4 }).observe(el.closest(".terminal"));
})();
