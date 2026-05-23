#!/usr/bin/env python3
"""
v0.7.1-compliant runegoblin bundle.

Constraints (per user direction):
- Theme cssVariables keyset is a strict subset of default theme — no new
  primitives, no runegoblin-only tokens like --text-glow-stroke.
- Component-config alias keyset matches the default config for each
  component — no new component tokens, no new components.
- Every alias value is `--<name>` so syncComponentsToCss emits valid CSS.
  Literal expressions in tokens.css (transparent, color-mix(...)) are
  mapped to the closest available primitive alias.
- Per-component variant files are `rg-<comp>.json` with name `rg-<comp>`.
  Components whose runegoblin values match default get no override file —
  the manifest entry stays on `default`.

Theme + manifest stay as `runegoblin.json` since those are not component
variants. fontStacks/fontSources are cleared so the runegoblin font
strings in cssVariables aren't stomped by resolveFontStacks().

Re-running this script also resets every component-config `_active.json`
and `_production.json` back to `default`, plus the theme and manifest
pointers, so the dev server is in a clean state before the user re-applies
the manifest from the editor UI.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional, Tuple

REPO = Path(__file__).resolve().parents[1]
SITE_TOKENS = REPO.parent / "runegoblin-site" / "src" / "styles" / "tokens.css"
THEMES_DIR = REPO / "themes"
CONFIGS_DIR = REPO / "component-configs"
MANIFESTS_DIR = REPO / "manifests"
DEFAULT_THEME = THEMES_DIR / "default.json"
DEFAULT_MANIFEST = MANIFESTS_DIR / "default.json"

THEME_NAME = "runegoblin"
THEME_LABEL = "Runegoblin"
MANIFEST_NAME = "runegoblin"
MANIFEST_LABEL = "Runegoblin"
NOW = datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")

VAR_RE = re.compile(r"^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);", re.IGNORECASE | re.MULTILINE)
VAR_REF_RE = re.compile(r"^var\(\s*(--[a-z0-9-]+)\s*\)$")
# Default schema renamed the brand-coloured palette from `primary` (runegoblin
# legacy) to `brand`. Match the family prefix (color/surface/border) and the
# special text-primary-color → text-brand pattern.
BRAND_FAMILY_RE = re.compile(r"^--(color|surface|border)-primary(-.*)?$")


def rename_to_v071(name: str) -> str:
    """Map runegoblin's `--*-primary-*` brand palette names to v0.7.1's
    `--*-brand-*`. `--text-primary` (the neutral text scale) is preserved;
    only the brand text variants under `--text-primary-*` are renamed."""
    if name == "--text-primary":
        return name
    if name == "--text-primary-color":
        return "--text-brand"
    if name.startswith("--text-primary-"):
        return "--text-brand-" + name[len("--text-primary-"):]
    m = BRAND_FAMILY_RE.match(name)
    if m:
        family, suffix = m.group(1), m.group(2) or ""
        return f"--{family}-brand{suffix}"
    return name

# Literal values in runegoblin tokens.css → closest valid primitive alias.
# These primitives resolve in tokens.css :root (the foundational layer the
# editor doesn't manage), so referencing them from a component config is safe
# even though the default theme's cssVariables doesn't enumerate them.
LITERAL_TO_ALIAS = {
    "transparent": "--color-transparent",
    # 75% opaque dark scrim → --overlay-higher is rgba(20, 3, 0, 0.77), ~75%.
    "color-mix(in srgb, var(--color-neutral-950) 75%, transparent)": "--overlay-higher",
    # 90%/85% opacity loses a sliver of translucency — closest opaque match
    # preserves the colour intent.
    "color-mix(in srgb, var(--surface-neutral-lower) 90%, transparent)": "--surface-neutral-lower",
    "color-mix(in srgb, var(--surface-neutral-lowest) 85%, transparent)": "--surface-neutral-lowest",
}


def parse_tokens_css(path: Path) -> Dict[str, str]:
    """First-occurrence-wins for each canonical name. Renames `-primary-*`
    brand keys to v0.7.1's `-brand-*` so lookups against the default schema
    work directly. Top-level :root values land before the @media-nested
    mobile font-size overrides, so first-wins keeps the base scale."""
    text = path.read_text()
    tokens: Dict[str, str] = {}
    for match in VAR_RE.finditer(text):
        name, value = match.group(1), match.group(2).strip()
        canonical = rename_to_v071(name)
        if canonical not in tokens:
            tokens[canonical] = value
    return tokens


def to_alias(value: str) -> Optional[str]:
    """Resolve a runegoblin tokens.css value to a v0.7.1 alias name.
    var(--foo) → renamed --foo; known literal → mapped primitive."""
    m = VAR_REF_RE.match(value)
    if m:
        return rename_to_v071(m.group(1))
    return LITERAL_TO_ALIAS.get(value)


def load(p: Path) -> dict:
    return json.loads(p.read_text())


def write_json(p: Path, data: dict) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, indent=2) + "\n")


# Foundational tokens defined in tokens.css :root that the default theme
# doesn't manage via fontStacks. Including the runegoblin font-family strings
# here lets syncTokensToCss write them into tokens.css so the runegoblin
# typeface intent is recorded (browser falls back to system fonts until the
# user wires real font sources up in the editor).
EXTRA_OVERLAY_KEYS = ("--font-display", "--font-sans", "--font-serif", "--font-mono")

# Editor palette families → the runegoblin `--color-*-500` token whose value
# seeds the palette's `baseColor`. The PaletteEditor's runtime derivation
# overlays palettesToVars over cssVariables (editorRenderer.ts), so setting
# only cssVariables would be stomped by the default's pink/teal/blue ramps.
# Writing baseColor here mirrors what the editor's `toTheme` would do if the
# import had gone through the UI — the two representations stay in sync.
#
# Tried in Phase 1: a server-side reconciler that snaps baseColor on load.
# Reverted — see temp/manifest-robustness-plan.md §9 ("default-theme
# regression"). Doing it import-time avoids the ambiguity of "import vs.
# drift" because the importer knows its own intent.
PALETTE_BASE_TOKEN = {
    "Neutral": "--color-neutral-500",
    "Alternate": "--color-alternate-500",
    "Background": "--color-canvas-500",
    "Brand": "--color-brand-500",
    "Accent": "--color-accent-500",
    "Special": "--color-special-500",
    "Success": "--color-success-500",
    "Warning": "--color-warning-500",
    "Info": "--color-info-500",
    "Danger": "--color-danger-500",
}


def build_theme(default_theme: dict, rg_tokens: Dict[str, str]) -> Tuple[dict, int]:
    theme = json.loads(json.dumps(default_theme))
    theme["name"] = THEME_LABEL
    theme["createdAt"] = NOW
    theme["updatedAt"] = NOW
    theme["fontSources"] = []
    theme["fontStacks"] = []

    css = dict(theme["cssVariables"])
    overlaid = 0
    for key in list(css.keys()):
        if key in rg_tokens and rg_tokens[key] != css[key]:
            css[key] = rg_tokens[key]
            overlaid += 1
    for key in EXTRA_OVERLAY_KEYS:
        if key in rg_tokens:
            css[key] = rg_tokens[key]
            overlaid += 1
    theme["cssVariables"] = css

    editor_configs = theme.get("editorConfigs", {})
    palette_overlaid = 0
    for palette_name, base_token in PALETTE_BASE_TOKEN.items():
        cfg = editor_configs.get(palette_name)
        if cfg is None:
            continue
        rg_value = rg_tokens.get(base_token)
        if rg_value and rg_value != cfg.get("baseColor"):
            cfg["baseColor"] = rg_value
            palette_overlaid += 1
        # Mark every palette we overlay (even idempotent matches) so the
        # storage-layer reconciler treats the import as authoritative. Without
        # this flag the reconciler would no-op and any downstream cssVariables
        # drift wouldn't get reconciled. See themeTypes.PaletteConfig._imported.
        if rg_value:
            cfg["_imported"] = True
    if palette_overlaid:
        print(f"theme: {palette_overlaid} palette baseColors overlaid")

    return theme, overlaid


def build_component_config(
    comp: str, default_cfg: dict, rg_tokens: Dict[str, str]
) -> Tuple[Optional[dict], int]:
    """Walk default_cfg.aliases and produce a complete alias map with
    runegoblin's value at each slot when it resolves to an alias. Returns
    (config_dict, diff_count). If diff_count is 0, returns (None, 0) and the
    caller leaves the manifest entry on default."""
    default_aliases = default_cfg.get("aliases", {})
    aliases: Dict[str, str] = {}
    diffs = 0
    for key, default_alias in default_aliases.items():
        rg_value = rg_tokens.get(key)
        if rg_value is None:
            aliases[key] = default_alias
            continue
        rg_alias = to_alias(rg_value)
        if rg_alias is None:
            # Unresolvable literal — keep the default alias to avoid emitting
            # an invalid `var(...)` wrap in syncComponentsToCss.
            aliases[key] = default_alias
            continue
        aliases[key] = rg_alias
        if rg_alias != default_alias:
            diffs += 1
    if diffs == 0:
        return None, 0
    return (
        {
            "name": f"rg-{comp}",
            "component": comp,
            "createdAt": NOW,
            "updatedAt": NOW,
            "aliases": aliases,
        },
        diffs,
    )


def reset_pointers() -> None:
    """Reset every theme / component-config / manifest active+production
    pointer to `default`. Keeps the dev server in a known-good state when
    variant filenames change; the user re-applies the manifest from the UI
    which re-flips everything atomically and re-syncs tokens.css."""
    def write_pointer(p: Path, key: str, value: str) -> None:
        p.write_text(json.dumps({key: value}))

    write_pointer(THEMES_DIR / "_active.json", "activeFile", "default")
    write_pointer(THEMES_DIR / "_production.json", "productionFile", "default")
    write_pointer(MANIFESTS_DIR / "_active.json", "activeFile", "default")

    for comp_dir in CONFIGS_DIR.iterdir():
        if not comp_dir.is_dir():
            continue
        active = comp_dir / "_active.json"
        prod = comp_dir / "_production.json"
        if active.exists():
            write_pointer(active, "activeFile", "default")
        if prod.exists():
            write_pointer(prod, "productionFile", "default")


def clean_old_runegoblin_variants() -> None:
    """Remove the previous `runegoblin.json` per-component variants — they're
    replaced by `rg-<comp>.json`."""
    for comp_dir in CONFIGS_DIR.iterdir():
        if not comp_dir.is_dir():
            continue
        legacy = comp_dir / "runegoblin.json"
        if legacy.exists():
            legacy.unlink()


def main() -> int:
    if not SITE_TOKENS.exists():
        print(f"missing {SITE_TOKENS}", file=sys.stderr)
        return 1

    rg_tokens = parse_tokens_css(SITE_TOKENS)
    default_theme = load(DEFAULT_THEME)
    default_manifest = load(DEFAULT_MANIFEST)
    components = list(default_manifest["componentConfigs"].keys())

    clean_old_runegoblin_variants()

    theme, overlaid = build_theme(default_theme, rg_tokens)
    write_json(THEMES_DIR / f"{THEME_NAME}.json", theme)
    print(
        f"theme: {overlaid}/{len(default_theme['cssVariables'])} primitives "
        f"overlaid → themes/{THEME_NAME}.json"
    )

    manifest_configs: Dict[str, str] = {}
    overrides_written = 0
    for comp in components:
        default_cfg_path = CONFIGS_DIR / comp / "default.json"
        if not default_cfg_path.exists():
            manifest_configs[comp] = "default"
            continue
        default_cfg = load(default_cfg_path)
        cfg, diffs = build_component_config(comp, default_cfg, rg_tokens)
        if cfg is None:
            manifest_configs[comp] = "default"
            print(f"  {comp}: no overrides → default")
        else:
            variant = f"rg-{comp}"
            write_json(CONFIGS_DIR / comp / f"{variant}.json", cfg)
            manifest_configs[comp] = variant
            overrides_written += 1
            print(f"  {comp}: {diffs} overrides → component-configs/{comp}/{variant}.json")

    manifest = {
        "name": MANIFEST_LABEL,
        "createdAt": NOW,
        "updatedAt": NOW,
        "theme": THEME_NAME,
        "componentConfigs": dict(sorted(manifest_configs.items())),
    }
    write_json(MANIFESTS_DIR / f"{MANIFEST_NAME}.json", manifest)
    print(f"manifest: manifests/{MANIFEST_NAME}.json ({overrides_written} component overrides)")

    reset_pointers()
    print("reset: theme/manifest/component-config pointers → default")
    print("       re-apply the Runegoblin manifest from the editor UI to load.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
