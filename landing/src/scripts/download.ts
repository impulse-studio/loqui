interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface Release {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
}

interface PlatformOption {
  label: string;
  ext: string;
  url: string;
  os: "macos" | "windows" | "linux";
}

const REPO = "impulse-studio/loqui";
const API_URL = `https://api.github.com/repos/${REPO}/releases/latest`;

// --- OS Detection ---

function detectOS(): "macos" | "windows" | "linux" | "unknown" {
  // Modern API (Chromium only)
  const uaData = (navigator as any).userAgentData;
  if (uaData?.platform) {
    const p = uaData.platform.toLowerCase();
    if (p === "macos") return "macos";
    if (p === "windows") return "windows";
    if (p === "linux") return "linux";
  }

  // Fallback: User Agent string
  const ua = navigator.userAgent.toLowerCase();
  if (/mac/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/linux/.test(ua)) return "linux";

  return "unknown";
}

// --- Asset → Platform mapping ---

function mapAssets(assets: ReleaseAsset[]): PlatformOption[] {
  const options: PlatformOption[] = [];

  for (const asset of assets) {
    const name = asset.name.toLowerCase();

    if (name.endsWith(".dmg") && name.includes("aarch64")) {
      options.push({ label: "macOS (Apple Silicon)", ext: ".dmg", url: asset.browser_download_url, os: "macos" });
    } else if (name.endsWith(".exe") && name.includes("setup")) {
      options.push({ label: "Windows (x64)", ext: ".exe", url: asset.browser_download_url, os: "windows" });
    } else if (name.endsWith(".msi")) {
      options.push({ label: "Windows (x64)", ext: ".msi", url: asset.browser_download_url, os: "windows" });
    } else if (name.endsWith(".appimage")) {
      options.push({ label: "Linux (x64)", ext: ".AppImage", url: asset.browser_download_url, os: "linux" });
    } else if (name.endsWith(".deb")) {
      options.push({ label: "Linux (x64)", ext: ".deb", url: asset.browser_download_url, os: "linux" });
    } else if (name.endsWith(".rpm")) {
      options.push({ label: "Linux (x64)", ext: ".rpm", url: asset.browser_download_url, os: "linux" });
    }
  }

  return options;
}

const OS_LABELS: Record<string, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
};

// Preferred format per OS (first match wins as primary)
const OS_PREFERRED_EXT: Record<string, string> = {
  macos: ".dmg",
  windows: ".exe",
  linux: ".AppImage",
};

// --- DOM wiring ---

function renderDropdownOption(opt: PlatformOption): HTMLAnchorElement {
  const a = document.createElement("a");
  a.href = opt.url;
  a.className =
    "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-bg-secondary hover:text-text-primary transition-colors";
  a.innerHTML = `
    <span>${opt.label}</span>
    <span class="rounded bg-bg-secondary px-1.5 py-0.5 text-xs font-mono text-text-tertiary">${opt.ext}</span>
  `;
  return a;
}

async function init() {
  const os = detectOS();
  const primaryBtn = document.getElementById("download-primary") as HTMLAnchorElement | null;
  const label = document.getElementById("download-label");
  const version = document.getElementById("download-version");
  const toggle = document.getElementById("download-toggle");
  const chevron = document.getElementById("download-chevron");
  const menu = document.getElementById("download-menu");
  const optionsContainer = document.getElementById("download-options");
  const allReleasesLink = document.getElementById("download-all-releases") as HTMLAnchorElement | null;

  // Footer elements
  const footerBtn = document.getElementById("footer-download") as HTMLAnchorElement | null;
  const footerLabel = document.getElementById("footer-download-label");
  const footerVersion = document.getElementById("footer-download-version");

  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const release: Release = await res.json();

    const ver = release.tag_name;
    const options = mapAssets(release.assets);

    // Set version badges
    if (version) version.textContent = ver;
    if (footerVersion) footerVersion.textContent = ver;

    // Update "all releases" link
    if (allReleasesLink) allReleasesLink.href = release.html_url;

    // Find primary download for detected OS
    const preferredExt = OS_PREFERRED_EXT[os] ?? ".dmg";
    const primary = options.find((o) => o.os === os && o.ext === preferredExt) ?? options.find((o) => o.os === os) ?? null;

    if (primary && primaryBtn && label) {
      primaryBtn.href = primary.url;
      label.textContent = `Download for ${OS_LABELS[os] ?? "your platform"}`;

      if (footerBtn && footerLabel) {
        footerBtn.href = primary.url;
        footerLabel.textContent = `Download for ${OS_LABELS[os] ?? "your platform"}`;
      }
    }

    // Populate dropdown
    if (optionsContainer) {
      for (const opt of options) {
        optionsContainer.appendChild(renderDropdownOption(opt));
      }
    }
  } catch {
    // API failed  - keep default links to releases page
    if (version) version.textContent = "";
    if (footerVersion) footerVersion.textContent = "";
  }

  // Dropdown toggle
  toggle?.addEventListener("click", () => {
    const isOpen = !menu?.classList.contains("hidden");
    menu?.classList.toggle("hidden");
    chevron?.classList.toggle("rotate-180");
    toggle.setAttribute("aria-expanded", String(!isOpen));
  });

  // Close on outside click
  document.addEventListener("click", (e) => {
    const group = document.getElementById("download-group");
    if (group && !group.contains(e.target as Node)) {
      menu?.classList.add("hidden");
      chevron?.classList.remove("rotate-180");
      toggle?.setAttribute("aria-expanded", "false");
    }
  });

  // Close on Escape
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      menu?.classList.add("hidden");
      chevron?.classList.remove("rotate-180");
      toggle?.setAttribute("aria-expanded", "false");
    }
  });
}

init();
