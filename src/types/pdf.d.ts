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
