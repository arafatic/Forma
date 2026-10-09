# Forma — Modern macOS Vector Studio

A lightweight, offline vector editor built with **Tauri v2**, **React**, **TypeScript**, and **Tailwind CSS**, featuring an Adobe Illustrator-inspired Bézier pen engine and a dark neutral Figma-style UI.

---

## 🚀 Getting Started

### 1. Browser Development Mode (Instant)
```bash
npm run dev
```
Open [http://localhost:1420](http://localhost:1420) to use Forma directly in your browser.

### 2. macOS Desktop Application (Tauri v2)
Ensure Rust is installed (`curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`), then run:
```bash
npm run tauri dev
```

---

## 🎨 Architecture & Code Map

| Module | Location | Purpose |
|---|---|---|
| **Pen Tool Math** | [`src/engine/penTool.ts`](file:///Users/arafat/Documents/0.%20Build/forma/src/engine/penTool.ts) | 45° angle snapping, handle mirroring, and path closure calculations. |
| **Canvas Renderer** | [`src/engine/renderer.ts`](file:///Users/arafat/Documents/0.%20Build/forma/src/engine/renderer.ts) | Pure Canvas 2D rendering pipeline (Grid, Bézier paths, Illustrator handles, rubber-band preview). |
| **Infinite Canvas** | [`src/components/Canvas.tsx`](file:///Users/arafat/Documents/0.%20Build/forma/src/components/Canvas.tsx) | Pan & zoom camera math, pointer event routing, and handle dragging. |
| **Inspector Panel** | [`src/components/PropertiesPanel.tsx`](file:///Users/arafat/Documents/0.%20Build/forma/src/components/PropertiesPanel.tsx) | Fill, stroke, stroke width, opacity, and path controls. |
| **Toolbar** | [`src/components/Toolbar.tsx`](file:///<thead>/forma/src/components/Toolbar.tsx) | Tool selection with hotkeys (`V`, `P`, `M`, `L`). |
| **Top Title Bar** | [`src/components/TitleBar.tsx`](file:///Users/arafat/Documents/0.%20Build/forma/src/components/TitleBar.tsx) | macOS drag region, new file, SVG export, and zoom indicator. |
| **SVG Exporter** | [`src/engine/svgExporter.ts`](file:///Users/arafat/Documents/0.%20Build/forma/src/engine/svgExporter.ts) | Converts canvas shapes into clean, exportable SVG files. |

---

## ⌨️ Shortcuts & Modifiers

- **`P`**: Pen Tool
  - **Single Click**: Place a sharp corner anchor point.
  - **Click & Drag**: Pull out symmetric Bézier handles.
  - **`Shift` + Drag**: Constrain handles to 45° increments.
  - **`Alt/Option` + Drag**: Break symmetry for sharp corner curves.
  - **Click on start point**: Closes the path.
  - **`Esc` or `Enter`**: Commit and finish the current open path.
- **`V`**: Selection Tool (Move elements or drag individual anchor points and handles).
- **`M`**: Rectangle Tool (`Shift` constrains to square).
- **`L`**: Ellipse Tool (`Shift` constrains to circle).
- **`Space` + Drag / Middle Click**: Pan infinite canvas.
- **Mouse Wheel**: Zoom in/out centered on mouse pointer.
- **`Backspace` / `Delete`**: Delete selected shape.
- **`Cmd +` / `Cmd -` / `Cmd 0`**: Zoom in, Zoom out, Reset zoom to 100%.
