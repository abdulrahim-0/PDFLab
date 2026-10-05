/// <reference lib="webworker" />

// pdf.js parses and decodes PDFs in this worker. Importing the bundle is enough:
// it detects the worker scope and starts listening for messages.
import 'pdfjs-dist/build/pdf.worker.mjs';
