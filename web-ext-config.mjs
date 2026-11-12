// Settings for web-ext. Dotfiles like .env and node_modules are skipped automatically.
// Everything not listed here ships in the extension.
export default {
    ignoreFiles: ["images", "test", "scripts", "README.md", "Makefile", "biome.json", "package.json", "pnpm-lock.yaml", "web-ext-config.mjs", "*.zip"],
    sign: {
        channel: "unlisted"
    }
}
