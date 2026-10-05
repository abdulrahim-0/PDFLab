/// <reference lib="webworker" />

// pdf.js parses and decodes PDFs in this worker. Importing the bundle is enough:
// it detects the worker scope and starts listening for messages. The legacy
// build is used for its polyfills (see PdfRenderService).
import 'pdfjs-dist/legacy/build/pdf.worker.mjs';
