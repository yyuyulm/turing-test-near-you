import { mkdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const packageDir = path.join(distDir, "package");
const chromeDir = path.join(distDir, "extension", "chrome");
const firefoxDir = path.join(distDir, "extension", "firefox");

const mode = process.argv[2] ?? "all";

const readRoot = (file) => readFile(path.join(root, file), "utf8");
const write = async (filePath, contents) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents);
};

const buildStandaloneBundle = async () => {
  const coreSource = await readRoot("detector-core.js");
  const elementSource = await readRoot("turing-test.js");

  const bundledCore = coreSource.replace("export class TuringTestCore", "class TuringTestCore");
  const bundledElement = elementSource
    .replace(/^import\s+\{\s*TuringTestCore\s*\}\s+from\s+"\.\/detector-core\.js";\n\n/, "")
    .replace(/^export class /gm, "class ");

  return `${bundledCore}\n\n${bundledElement}`;
};

const buildPackage = async () => {
  await mkdir(packageDir, { recursive: true });
  await copyFile(path.join(root, "detector-core.js"), path.join(packageDir, "detector-core.js"));
  await copyFile(path.join(root, "turing-test.js"), path.join(packageDir, "turing-test.module.js"));
  await write(path.join(distDir, "turing-test.js"), await buildStandaloneBundle());
  await write(
    path.join(packageDir, "package.json"),
    `${JSON.stringify(
      {
        name: "turing-test",
        version: "0.1.0",
        description: "A reusable Turing test overlay custom element for websites and browser extensions.",
        type: "module",
        main: "./turing-test.module.js",
        module: "./turing-test.module.js",
        exports: {
          ".": "./turing-test.module.js",
          "./core": "./detector-core.js"
        },
        license: "MIT"
      },
      null,
      2
    )}\n`
  );
};

const extensionContentScript = `(() => {
  const mountOverlay = () => {
    if (document.querySelector('turing-test[data-extension-root]')) return;

    const overlay = document.createElement('turing-test');
    overlay.setAttribute('data-extension-root', '');
    document.documentElement.appendChild(overlay);
  };

  const injectedScriptId = 'turing-test-extension-script';
  if (!document.getElementById(injectedScriptId)) {
    const script = document.createElement('script');
    script.id = injectedScriptId;
    script.src = chrome.runtime.getURL('turing-test.bundle.js');
    script.onload = () => script.remove();
    (document.head || document.documentElement).appendChild(script);
  }

  if (customElements.get('turing-test')) {
    mountOverlay();
  } else {
    window.addEventListener('turing-test:ready', mountOverlay, { once: true });
  }
})();
`;

const chromeManifest = {
  manifest_version: 3,
  name: "Turing Test Overlay",
  version: "0.1.0",
  description: "Injects the Turing Test overlay into pages.",
  content_scripts: [
    {
      matches: ["<all_urls>"],
      js: ["content-script.js"],
      run_at: "document_idle"
    }
  ],
  web_accessible_resources: [
    {
      resources: ["turing-test.bundle.js"],
      matches: ["<all_urls>"]
    }
  ]
};

const firefoxManifest = {
  ...chromeManifest,
  browser_specific_settings: {
    gecko: {
      id: "turing-test@example.com"
    }
  }
};

const buildExtension = async () => {
  const bundle = await buildStandaloneBundle();
  await write(path.join(chromeDir, "turing-test.bundle.js"), bundle);
  await write(path.join(firefoxDir, "turing-test.bundle.js"), bundle);
  await write(path.join(chromeDir, "content-script.js"), extensionContentScript);
  await write(path.join(firefoxDir, "content-script.js"), extensionContentScript);
  await write(path.join(chromeDir, "manifest.json"), `${JSON.stringify(chromeManifest, null, 2)}\n`);
  await write(path.join(firefoxDir, "manifest.json"), `${JSON.stringify(firefoxManifest, null, 2)}\n`);
};

await rm(distDir, { recursive: true, force: true });

if (mode === "all" || mode === "package") {
  await buildPackage();
}

if (mode === "all" || mode === "extension") {
  await buildExtension();
}
