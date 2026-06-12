// 0xCMS landing — vanilla JS interactions

// ── Navbar: glass background after scrolling past the hero top ──────────────
const navbar = document.getElementById('navbar');
const onScroll = () => {
  if (window.scrollY > 24) {
    navbar.classList.add('glass');
  } else {
    navbar.classList.remove('glass');
  }
};
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// ── Mobile menu ──────────────────────────────────────────────────────────────
const menuBtn = document.getElementById('menu-btn');
const mobileMenu = document.getElementById('mobile-menu');
menuBtn.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
mobileMenu.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => mobileMenu.classList.add('hidden')),
);

// ── Scroll reveal ────────────────────────────────────────────────────────────
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12 },
);
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

// ── Terminal typing loop ─────────────────────────────────────────────────────
const typedEl = document.getElementById('typed');
const lines = [
  'wrangler tail 0xcms',
  'open https://cms.eventuai.com',
  'PUBLISH_TARGETS="d1,r2" # + ipfs via plugin',
  'wrangler d1 migrations apply cms',
  'echo "gm, content."',
];
let lineIdx = 0;
let charIdx = 0;
let deleting = false;

function typeLoop() {
  const line = lines[lineIdx];

  if (!deleting) {
    charIdx++;
    typedEl.textContent = line.slice(0, charIdx);
    if (charIdx === line.length) {
      deleting = true;
      setTimeout(typeLoop, 2200);
      return;
    }
    setTimeout(typeLoop, 55 + Math.random() * 60);
  } else {
    charIdx--;
    typedEl.textContent = line.slice(0, charIdx);
    if (charIdx === 0) {
      deleting = false;
      lineIdx = (lineIdx + 1) % lines.length;
      setTimeout(typeLoop, 500);
      return;
    }
    setTimeout(typeLoop, 22);
  }
}
typeLoop();

// ── Copy-to-clipboard for code blocks ────────────────────────────────────────
document.querySelectorAll('.copy-btn').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const code = btn.parentElement.querySelector('code');
    if (!code) return;
    // Strip prompt markers and comment-only lines for a paste-ready command.
    const text = code.innerText
      .split('\n')
      .map((l) => l.replace(/^\$\s?/, ''))
      .filter((l) => !l.trim().startsWith('#') && l.trim() !== '')
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      btn.textContent = 'copied ✓';
      btn.classList.add('text-mint');
    } catch {
      btn.textContent = 'failed';
    }
    setTimeout(() => {
      btn.textContent = 'copy';
      btn.classList.remove('text-mint');
    }, 1600);
  });
});
