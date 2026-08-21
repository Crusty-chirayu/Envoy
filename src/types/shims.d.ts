declare module 'mammoth' {
  export interface Result {
    value: string
    messages: string[]
  }
  
  export function extractRawText(options: { arrayBuffer: ArrayBuffer }): Promise<Result>
  export function extractRawText(options: { buffer: Buffer }): Promise<Result>
}

declare module 'pdf-parse' {
  interface PDFInfo {
    PDFFormatVersion: string
    IsAcroFormPresent: boolean
    IsXFAPresent: boolean
    [key: string]: unknown
  }

  interface PDFData {
    numpages: number
    numrender: number
    info: PDFInfo
    metadata: unknown
    text: string
    version: string
  }

  function pdf(dataBuffer: Buffer, options?: unknown): Promise<PDFData>
  export default pdf
}
