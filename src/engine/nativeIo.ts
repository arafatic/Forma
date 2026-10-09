import { isTauri } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import { writeTextFile, writeFile, readFile } from '@tauri-apps/plugin-fs';

/**
 * Checks whether the application is running within the native Tauri desktop shell
 */
export function isTauriApp(): boolean {
  try {
    return isTauri();
  } catch {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
  }
}

/**
 * Maps asset file extensions to standard MIME types
 */
function getMimeType(filename: string): string {
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'svg':
      return 'image/svg+xml';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'bmp':
      return 'image/bmp';
    case 'psd':
      return 'image/vnd.adobe.photoshop';
    case 'ai':
      return 'application/illustrator';
    case 'eps':
      return 'application/postscript';
    default:
      return 'application/octet-stream';
  }
}

/**
 * Native macOS Save Dialog for SVG files with web fallback
 */
export async function nativeSaveSvg(
  svgContent: string,
  defaultFilename: string = 'forma-artwork.svg'
): Promise<{ success: boolean; filePath?: string }> {
  if (isTauriApp()) {
    try {
      const selectedPath = await save({
        title: 'Export Scalable Vector Graphics (SVG)',
        defaultPath: defaultFilename,
        filters: [{ name: 'Scalable Vector Graphics (*.svg)', extensions: ['svg'] }],
      });

      if (selectedPath) {
        await writeTextFile(selectedPath, svgContent);
        return { success: true, filePath: selectedPath };
      }
      return { success: false };
    } catch (err) {
      console.warn('Native Tauri SVG save failed, falling back to browser download:', err);
    }
  }

  // Web Browser Fallback: Blob URL download
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return { success: true, filePath: defaultFilename };
}

/**
 * Native macOS Save Dialog for PNG files with web fallback
 */
export async function nativeSavePng(
  dataUrlOrBlob: Blob | string,
  defaultFilename: string = 'forma-artwork.png'
): Promise<{ success: boolean; filePath?: string }> {
  if (isTauriApp()) {
    try {
      const selectedPath = await save({
        title: 'Export Raster Image (PNG)',
        defaultPath: defaultFilename,
        filters: [{ name: 'Portable Network Graphics (*.png)', extensions: ['png'] }],
      });

      if (selectedPath) {
        let uint8: Uint8Array;
        if (typeof dataUrlOrBlob === 'string') {
          const res = await fetch(dataUrlOrBlob);
          const buf = await res.arrayBuffer();
          uint8 = new Uint8Array(buf);
        } else {
          const buf = await dataUrlOrBlob.arrayBuffer();
          uint8 = new Uint8Array(buf);
        }
        await writeFile(selectedPath, uint8);
        return { success: true, filePath: selectedPath };
      }
      return { success: false };
    } catch (err) {
      console.warn('Native Tauri PNG save failed, falling back to browser download:', err);
    }
  }

  // Web Browser Fallback
  let url: string;
  let shouldRevoke = false;
  if (typeof dataUrlOrBlob === 'string') {
    url = dataUrlOrBlob;
  } else {
    url = URL.createObjectURL(dataUrlOrBlob);
    shouldRevoke = true;
  }

  const link = document.createElement('a');
  link.href = url;
  link.download = defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (shouldRevoke) URL.revokeObjectURL(url);
  return { success: true, filePath: defaultFilename };
}

/**
 * Native macOS Open Dialog for selecting and loading asset files with web fallback
 */
export async function nativeOpenAssets(): Promise<File[]> {
  if (isTauriApp()) {
    try {
      const selected = await open({
        multiple: true,
        directory: false,
        title: 'Open / Place Vector & Image Assets',
        filters: [
          {
            name: 'All Supported Assets (*.svg, *.png, *.jpg, *.psd, *.ai, *.eps)',
            extensions: ['svg', 'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp', 'psd', 'ai', 'eps'],
          },
          { name: 'Scalable Vector Graphics (*.svg)', extensions: ['svg'] },
          { name: 'Raster Images (*.png, *.jpg, *.webp)', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] },
          { name: 'Photoshop Document (*.psd)', extensions: ['psd'] },
          { name: 'Illustrator & PostScript (*.ai, *.eps)', extensions: ['ai', 'eps'] },
        ],
      });

      if (!selected) return [];

      const paths = Array.isArray(selected) ? selected : [selected];
      const files: File[] = [];

      for (const p of paths) {
        const uint8 = await readFile(p);
        const filename = p.split(/[/\\]/).pop() || 'asset';
        const mimeType = getMimeType(filename);
        const file = new File([uint8], filename, { type: mimeType });
        files.push(file);
      }

      return files;
    } catch (err) {
      console.warn('Native Tauri asset open dialog failed:', err);
    }
  }

  return [];
}
