import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * Export a DOM element to a PDF file.
 * @param {string} elementId DOM element id to capture.
 * @param {string} filename Output filename.
 * @returns {Promise<void>} Resolves after the file is saved.
 */
export async function exportToPDF(elementId, filename = 'molforge-report.pdf') {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Unable to find element with id "${elementId}".`);
  }
  const canvas = await html2canvas(element, { backgroundColor: '#0a0a0f', scale: 2 });
  const image = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = (canvas.height * pageWidth) / canvas.width;
  pdf.addImage(image, 'PNG', 0, 0, pageWidth, Math.min(pageHeight, pdf.internal.pageSize.getHeight()));
  pdf.save(filename);
}

/**
 * Export molecule and property data to JSON.
 * @param {object} molecule Molecule payload.
 * @param {object} properties Property payload.
 * @param {string} filename Output filename.
 * @returns {void}
 */
export function exportToJSON(molecule, properties, filename = 'molforge-design.json') {
  const payload = {
    exportedAt: new Date().toISOString(),
    molecule,
    properties
  };
  downloadText(JSON.stringify(payload, null, 2), filename, 'application/json');
}

/**
 * Export a MOL block as an SDF file.
 * @param {string} molblock MOL block text.
 * @param {string} filename Output filename.
 * @returns {void}
 */
export function exportToSDF(molblock, filename = 'molforge-structure.sdf') {
  if (!molblock) {
    throw new Error('No MOL block is available to export.');
  }
  downloadText(`${molblock}\n$$$$\n`, filename, 'chemical/x-mdl-sdfile');
}

/**
 * Download a text blob from the browser.
 * @param {string} text Text content.
 * @param {string} filename Output filename.
 * @param {string} type MIME type.
 * @returns {void}
 */
export function downloadText(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
