# Forma — Architectural Specification & Master Roadmap

> **Forma** is a modern, high-performance, offline vector graphics editor for macOS—built as an Adobe Illustrator alternative, inspired by the architecture of Vectorcraft and Figma.

---

## 🏗 High-Level Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Desktop Shell** | [Tauri v2](https://v2.tauri.app/) (Rust) | Native macOS window chrome, zero-overhead offline runtime, sandboxed local file system access, small footprint. |
| **Frontend Framework** | React 19 + TypeScript (Vite) | Declarative state orchestration, strict typing for vector math structures. |
| **Vector Engine** | HTML5 Canvas 2D + Native Bézier Math | Direct hardware-accelerated 2D rendering without DOM overhead; precise cubic Bézier curve evaluation and control point manipulation. |
| **Styling & Theme** | Tailwind CSS v4 | Dark neutral Figma-style UI palette (`#121214`, `#18181b`, `#1e1e24`), custom macOS title bar styling. |

---

## 🏛 System Architecture & Core Principles

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Forma Desktop Window                          │
├────────────────────────────────────────────────────────────────────────┤
│ TitleBar: Native Drag Region + macOS Traffic Lights + MenuBar + Zoom  │
├────────────┬──────────────────────────────────────────────┬────────────┤
│ Toolbar    │ Center Canvas Viewport                       │ Inspector  │
│ (V, P, M,  │  • World <-> Screen Coordinate Space         │ Properties │
│  L, T)     │  • Infinite Pan & Zoom Engine                │ Panel      │
│            │  • HTML5 2D Bézier Pipeline                  │            │
│            │  • Interactive Gizmos (Anchors & Handles)    │ Layers     │
│            │  • Bounding Boxes & Transform Manipulators   │ Panel      │
└────────────┴──────────────────────────────────────────────┴────────────┘
```

1. **Dual Coordinate Space**:
   - **Screen Space**: Device pixels relative to viewport.
   - **World Space**: Unbounded mathematical coordinate space where geometry resides.
   - Transformations are managed via `screenToWorld` and `worldToScreen` camera matrices:
     $$\text{Screen} = \text{World} \times \text{Zoom} + \text{Pan}$$
     $$\text{World} = \frac{\text{Screen} - \text{Pan}}{\text{Zoom}}$$
2. **Native Bézier Engine**:
   - Anchor points store position `P`, incoming tangent handle `handleIn`, and outgoing tangent handle `handleOut`.
   - Modifiers enforce Illustrator parity: `Shift` constrains angles to 45° increments; `Alt/Option` decouples tangent handles to break curve continuity into a sharp cusp.
3. **Immutability & History Stack**:
   - Elements are stored in an immutable scene array with a rolling 40-step undo/redo buffer (`history`, `historyIndex`).

---

## 🗺 Phased Implementation Roadmap

### 🟢 Phase 1: Foundation (Completed)
- [x] **Infinite Canvas Viewport**:
  - Smooth pan via `Space + Drag` or Middle Mouse button.
  - Centered zoom via Mouse Wheel with invariant cursor focus.
  - Device Pixel Ratio (Retina) high-DPI scaling.
- [x] **Pen Tool Core Bézier Engine**:
  - Single-click corner anchor placement.
  - Click-and-drag symmetric handle pulling.
  - `Shift` modifier for 45° angle snapping.
  - `Alt/Option` modifier for independent handle breaking (cusps).
  - Path closing snap detection on starting anchor.
  - Live cubic Bézier rubber-band preview segment.
  - `Escape` or `Enter` path completion.
- [x] **Smart Canvas Reset**:
  - `+ New` button and `Cmd+N` shortcut.
  - Direct reset if empty; Figma-style confirmation dialog if artwork exists.
  - Canvas revision key remounting to purge in-progress drawing states.
  - Viewport auto-centering to world origin `(0, 0)` at 100% zoom.
- [x] **macOS Top Menu Bar**:
  - Dropdowns: **File**, **Edit**, **Object**, **View**.
  - Dropdown hover switching, keyboard navigation, and outside-click dismissal.
  - Isolated macOS window drag region (`-webkit-app-region: no-drag`).
- [x] **SVG Exporter**:
  - Document bounding box calculation and standards-compliant SVG XML export.
  - Instant high-res 2x PNG raster export.

---

### 🟢 Phase 2: Transform Engine (Completed)
- [x] **Selection Tool (V) Transform Box**:
  - 8-point interactive bounding box (Top, Bottom, Left, Right, 4 Corners).
  - Proportional scaling with `Shift`.
  - Body dragging / translation.
  - Empty canvas click deselects.
- [x] **Rotation Engine**:
  - Corner hover curved rotation cursor.
  - Smooth interactive rotation around center pivot with 15° increment snap on `Shift`.
- [x] **Edit Shortcuts & Manipulations**:
  - `Cmd+D` / `Ctrl+D` Duplicate offset (+20px, +20px).
  - Arrow Keys 1px nudge (10px with `Shift`).
  - `Cmd+A` Select All, `Backspace` / `Delete` remove selection.
- [x] **Layers Hierarchy Panel & Grouping Engine**:
  - Vertical tree view displaying shape names, type icons, and nested hierarchy.
  - HTML5 drag-and-drop layer reordering (Z-index manipulation).
  - Layer Visibility toggle (eye icon) & Lock toggle (padlock icon).
  - Inline double-click layer renaming.
  - Multi-element selection and grouping (`Cmd+G` / `Cmd+Shift+G`).
  - Canvas double-click group isolation drill-down.
  - Z-Index commands: Bring Forward (`Cmd+]`), Bring to Front (`Shift+Cmd+]`), Send Backward (`Cmd+[`), Send to Back (`Shift+Cmd+[`).

---

### 🟢 Phase 3: Vector Operations & Styling (Completed)
- [x] **Boolean Pathfinder**:
  - **Union (Unite)**: Merges overlapping closed paths into a single perimeter.
  - **Subtract (Minus Front)**: Cuts the top shape out of the bottom shape.
  - **Intersect**: Retains only overlapping regions.
  - **Exclude (Difference)**: Retains non-overlapping regions.
  - High-precision 2D Bézier curve clipping via Paper.js with instant conversion back to editable Bézier path elements.
  - Top Menu Bar (`Object -> Pathfinder`) + Inspector Panel interactive controls + shortcuts (`⌥⌘U`, `⌥⌘-`, `⌥⌘I`, `⌥⌘X`).
- [x] **Advanced Color & Gradient Engine**:
  - Fill types: Solid, Linear Gradient, Radial Gradient.
  - Interactive multi-stop color slider (add stops, drag stop offsets, color picker per stop, reverse stops, presets).
  - Canvas gradient handle vector overlay: live interactive line to adjust gradient angle, origin, and spread.
- [x] **Advanced Stroke Engine**:
  - Line Cap: Butt, Round, Square.
  - Line Join: Miter, Round, Bevel.
  - Dashed strokes: Solid, Dashed (6 6), Dotted (2 6), custom arrays.
- [x] **Undo / Redo Integration**:
  - All Pathfinder operations and gradient/stroke modifications push cleanly to the rolling 40-step undo/redo stack (`⌘Z` / `⇧⌘Z`).

---

### 🟢 Phase 3.5: Artboard System & Document Presets (Completed)
- [x] **New Document Dialog Modal**:
  - Figma/Illustrator-style dark dialog (`⌘N` / `+ New` / `File -> New`).
  - Curated Presets: Web (FHD, MacBook, HD), Social (IG Post, Story/Reel, Banner), Print (A4, Letter, Business Card).
  - Manual dimensions & unit conversions: Pixels (`px`), Inches (`in`), Millimeters (`mm`), Points (`pt`).
  - Orientation toggle (Portrait vs. Landscape) and Background selection (White, Transparent, Dark).
- [x] **Infinite Canvas Artboard Rendering**:
  - Neutral dark infinite canvas workspace with elevated artboard surface, drop shadow, and border outline.
  - Transparent checkerboard pattern support.
  - Live dimension label above top-left corner (`Name — W × H px`).
  - Auto-fit viewport camera centering with comfortable margins.
- [x] **Export Modes (Artboard vs. Design Bounds)**:
  - Export SVG & PNG clipped strictly to the Artboard bounds or fitted to tight vector design bounds.

### 🟢 Phase 4: Typography & Assets (Completed)
- [x] **Text Tool (T) Engine**:
  - Tool shortcut `T` in Toolbar and global hotkeys.
  - Interactive placement on canvas click at world coordinates.
  - Direct inline canvas text editing overlay (scaling with zoom & pan).
  - Double-click on text element to edit inline.
  - 8-point bounding box transform (scaling font size proportionally, translation).
  - Native SVG `<text>` export with multi-line `<tspan>`, text-anchor, and typography attributes.
- [x] **Typography Inspector Panel**:
  - Font Family selection (Inter, Roboto, Playfair Display, Fira Code, System Sans, Georgia, Helvetica Neue, Courier New).
  - Font Size input & range slider (pt/px).
  - Font Weight selector (Light 300, Regular 400, Medium 500, Semi-Bold 600, Bold 700, Extra-Bold 800).
  - Text Alignment controls (Left, Center, Right, Justify).
  - Letter Spacing (Tracking) slider & number input.
  - Line Height slider & number input.
  - Full Fill & Stroke color engine integration for text.
  - Direct text content editor textarea in Inspector panel.
- [x] **Multi-Format Asset Import Pipeline**:
  - Support via drag-and-drop onto canvas and `File -> Place…` (`⇧⌘P`).
  - **SVG files**: Parsed directly into native editable Forma vector paths & compound shapes.
  - **Raster Images (PNG, JPG, WebP, GIF, BMP)**: Placed as scalable, movable `ImageElement` with image caching.
  - **PSD files**: Direct parsing via `ag-psd` extracting high-fidelity composite raster preview with transparency.
  - **AI & EPS files**: Composite preview extraction and stream decoding.
  - Visual drop zone feedback when dragging files over canvas.
  - Full transform, opacity, lock, hide, and layers hierarchy support for imported assets.

---

### 🟢 Phase 4.5: Docked Right Sidebar & Context-Aware Document Setup (Completed)
- [x] **Illustrator-Style 3-Tab Dock**:
  - Prominent tabs: **`[Properties]`** | **`[Layers]`** | **`[Libraries]`** with active pill highlight.
  - Thin icon strip collapse/expand toggle (`>>` / `<<`) preserving canvas workspace width.
- [x] **Context-Aware Properties Tab**:
  - **State A (No Selection - Document Setup Mode)**:
    - Artboard Units selector (`px`, `in`, `mm`, `pt`), dimensions display, orientation swap, surface color.
    - "Edit Artboard Presets" trigger modal.
    - Rulers toggle, Grid toggle (`⌘'`), Snap to Grid toggle.
    - Snap to Point & Snap to Guides toggles.
    - Quick Actions: Reset Zoom 100% (`⌘0`), Export SVG, Export PNG, New Document.
  - **State B (Selection Active - Element Inspector Mode)**:
    - Bounding Box Transform Card ($X, Y, W, H$) with aspect ratio lock/unlink toggle.
    - Placed Image Inspector with thumbnail and "Replace Image…" action.
    - Typography Inspector for TextElements.
    - Fill & Stroke Engines and Boolean Pathfinder for vector paths.
    - Opacity slider and Delete Selected action.
- [x] **Layers Tab Integration**:
  - Reverse Z-index hierarchical layer tree with type icons.
  - Inline Eye (visibility) and Padlock (lock) toggles.
  - Drag-and-drop layer reordering and double-click inline renaming.
  - Group (`⌘G`) and Ungroup (`⇧⌘G`) quick actions.
- [x] **Libraries & Assets Tab**:
  - Dynamic Document Swatches extracted from existing artwork + Forma Core swatches.
  - Media Asset Tray showing all placed images and SVGs with dimensions and one-click canvas selection.
  - "Place New Asset…" quick action (`⇧⌘P`).

---

### 🟢 Phase 5: Native Desktop & Packaging (Completed)
- [x] **Phase 5 (Part 1 of 2) - Native macOS Desktop Configuration & Offline File I/O (Completed)**:
  - **Tauri v2 Native macOS Window Shell**:
    - Product ID: `com.forma.vectoreditor`, Product Name: `Forma`.
    - Frameless macOS window with native hidden titlebar (`titleBarStyle: "Overlay"`, `hiddenTitle: true`, min dimensions 1024x700).
    - Integrated traffic light button inset spacing (`w-16`) and window drag header (`data-tauri-drag-region`).
    - Bundle configuration targeting native macOS `.dmg`.
  - **Security Capabilities & Permissions**:
    - `src-tauri/capabilities/default.json` configured for `@tauri-apps/plugin-dialog` and `@tauri-apps/plugin-fs`.
    - File system access for reading/writing SVG, PNG, and asset files.
  - **Native macOS File Dialogs & Offline File I/O (`src/engine/nativeIo.ts`)**:
    - **Save / Export SVG (`⌘S`)**: Opens native macOS Finder Save dialog to write `.svg` directly to filesystem.
    - **Save / Export PNG (`⇧⌘S`)**: Opens native macOS Finder Save dialog to write high-resolution `.png` directly.
    - **Open / Place Asset (`⌘O` / `⇧⌘P`)**: Opens native macOS Finder Open dialog supporting SVG, PNG, JPG, WebP, PSD, AI, EPS with native buffer reading via `readFile`.
    - **100% Offline Vector Editing**: Zero cloud or network dependencies for all vector drawing, styling, and file operations.
    - **Seamless Browser Fallback**: Graceful fallback to browser Blob URL download and `<input type="file">` when running in web dev mode.
- [x] **Phase 5 (Part 2 of 2) - Automated GitHub Actions .dmg Release Workflow (Completed)**:
  - **GitHub Actions Workflow (`.github/workflows/release.yml`)**:
    - Triggered automatically on push of semantic version tags (`v*`).
    - Runner environment: `macos-latest`.
    - Multi-Architecture Matrix: Parallel builds for **Apple Silicon (`aarch64-apple-darwin`)** and **Intel Macs (`x86_64-apple-darwin`)**.
    - Steps: Repository checkout (`actions/checkout@v4`), Node.js setup with npm cache (`actions/setup-node@v4`), Rust stable toolchain setup with target cross-compilers (`dtolnay/rust-toolchain@stable`), dependency installation & client build (`npm run build`).
    - Automated packaging & release creation via `tauri-apps/tauri-action@v0` with `GITHUB_TOKEN`.
    - Automatic publication and attachment of final `.dmg` installers directly to the GitHub Release.

---

## ⌨️ Master Keyboard Shortcut Matrix

| Shortcut | Action | Scope |
|---|---|---|
| **`V`** | Select Tool | Global |
| **`P`** | Pen Tool | Global |
| **`M`** | Rectangle Tool | Global |
| **`L`** | Ellipse Tool | Global |
| **`T`** | Text Tool | Global |
| **`Cmd + Shift + P`** | Place Asset (SVG, Images, PSD, AI, EPS) | Global |
| **`Space` + Drag** / **Middle Click** | Pan Canvas | Canvas |
| **Wheel** | Zoom centered on cursor | Canvas |
| **`Cmd + N`** | New Document | Global |
| **`Cmd + O`** | Open SVG | Global |
| **`Cmd + S`** | Export SVG | Global |
| **`Cmd + Shift + S`** | Export PNG | Global |
| **`Cmd + Z`** | Undo | Global |
| **`Cmd + Shift + Z`** | Redo | Global |
| **`⌫` / `Delete`** | Delete selected element | Selection |
| **`Cmd + A`** | Select all | Global |
| **`Cmd + G`** | Group selection | Selection |
| **`Cmd + Shift + G`** | Ungroup selection | Selection |
| **`Cmd + ]`** | Bring Forward | Selection |
| **`Cmd + [`** | Send Backward | Selection |
| **`Cmd + =`** | Zoom In | Global |
| **`Cmd + -`** | Zoom Out | Global |
| **`Cmd + 0`** | Reset Zoom to 100% | Global |
| **`Cmd + '`** | Toggle Grid | Global |

---

## 📁 Repository Directory Structure

```
forma/
├── PROJECT_SPEC.md              # THIS SPECIFICATION FILE (Master Blueprint)
├── README.md                    # Quickstart & setup documentation
├── package.json                 # Node dependencies and scripts
├── vite.config.ts               # Vite bundler configuration
├── tsconfig.json                # TypeScript compiler configuration
├── src-tauri/                   # Tauri v2 Desktop Engine
│   ├── Cargo.toml               # Rust dependencies
│   ├── tauri.conf.json          # Window configuration, capabilities & permissions
│   ├── src/
│   │   ├── main.rs              # Desktop executable entry point
│   │   └── lib.rs               # Tauri app builder and plugin registration
│   └── capabilities/
│       └── default.json         # Security capability manifest
└── src/                         # Frontend Application (React 19 + TypeScript)
    ├── main.tsx                 # React DOM mount point
    ├── App.tsx                  # Root state orchestration, history stack & shortcuts
    ├── index.css                # Base Tailwind & custom dark theme scrollbars
    ├── types/
    │   └── vector.ts            # Core geometric types (Point, AnchorPoint, VectorElement)
    ├── engine/
    │   ├── penTool.ts           # Illustrator Bézier math, 45° snapping, handle mirroring
    │   ├── renderer.ts          # Pure Canvas 2D render loop (Grid, Shapes, Bézier Gizmos)
    │   └── svgExporter.ts       # SVG & high-res PNG export pipeline
    └── components/
        ├── TitleBar.tsx         # macOS drag chrome & traffic light offsets
        ├── MenuBar.tsx          # macOS / Figma dropdown menu system
        ├── Toolbar.tsx          # Floating left tool dock (V, P, M, L)
        ├── Canvas.tsx           # Infinite Pan/Zoom canvas & pointer event handling
        └── PropertiesPanel.tsx  # Right inspector (Fill, Stroke, Width, Opacity)
```
