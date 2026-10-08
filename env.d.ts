/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FINGER_TOKEN: string
  /** Host API saat dev di localhost (default 192.168.10.67), mis. "localhost" untuk Laragon. */
  readonly VITE_API_HOST?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'pdf-lib' {
  export const PDFDocument: any
  export const rgb: any
  export const degrees: any
  export const StandardFonts: any
  const rest: Record<string, any>
  export default rest
}

declare module 'pdfjs-dist' {
  export const GlobalWorkerOptions: any
  export const getDocument: any
  export const version: any
  export const Util: any
  const rest: Record<string, any>
  export default rest
}

declare module 'pdfjs-dist/build/pdf.worker.min.mjs?url' {
  const url: string
  export default url
}

declare module '@vueup/vue-quill' {
  import { DefineComponent } from 'vue'
  export const QuillEditor: DefineComponent<{}, {}, any>
}