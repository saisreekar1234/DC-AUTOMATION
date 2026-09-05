const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pool = require("../config/database");

/*
 * Project-specific cover-page template engine - V1
 *
 * Strategy:
 * 1. Each project can have its own blank cover-page PDF template.
 * 2. The template supplies the exact layout, borders, logos and headings.
 * 3. This service overlays live document/revision values onto the template.
 * 4. The template itself is never modified.
 *
 * This is intentionally safer than rebuilding every client's cover page
 * in JavaScript.
 */

const TEMPLATE_ROOT = path.resolve(
  process.env.COVER_PAGE_TEMPLATE_ROOT ||
    path.join(__dirname, "../../templates/cover-pages")
);

function templatePathForProject(projectCode) {
  const safeCode = String(projectCode || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "_");

  return path.join(TEMPLATE_ROOT, safeCode, "cover-page.pdf");
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB");
}

function safeText(value) {
  return value === null || value === undefined || value === ""
    ? "—"
    : String(value);
}

async function getCoverPageData(documentId) {
  const documentResult = await pool.query(
    `
      SELECT
        d.id,
        d.project_id,
        d.document_number,
        d.title,
        d.customer_document_number,
        d.vendor_document_number,
        d.document_type,
        d.current_revision_id,

        p.project_code,
        p.project_name,

        cr.revision_code AS current_revision_code,
        cr.revision_stage AS current_revision_stage,
        cr.status AS current_revision_status,
        cr.issue_purpose AS current_issue_purpose,
        cr.revision_date AS current_revision_date

      FROM documents d
      INNER JOIN projects p
        ON p.id = d.project_id

      LEFT JOIN revisions cr
        ON cr.id = d.current_revision_id

      WHERE d.id = $1
      LIMIT 1
    `,
    [documentId]
  );

  if (documentResult.rows.length === 0) {
    const error = new Error("Document not found");
    error.statusCode = 404;
    throw error;
  }

  const document = documentResult.rows[0];

  const revisionsResult = await pool.query(
    `
      SELECT
        r.id,
        r.revision_code,
        r.sequence_order,
        r.revision_stage,
        r.status,
        r.issue_purpose,
        r.revision_date
      FROM revisions r
      WHERE r.document_id = $1
      ORDER BY r.sequence_order ASC, r.id ASC
    `,
    [documentId]
  );

  const transmittalResult = await pool.query(
    `
      SELECT
        ct.id,
        ct.customer_name,
        ct.transmittal_reference,
        ct.transmittal_date,
        cti.customer_revision,
        cti.purpose_code,
        cti.response_type,
        cti.response_action,
        cti.response_processed,
        cti.created_at
      FROM customer_transmittal_items cti
      INNER JOIN customer_transmittals ct
        ON ct.id = cti.transmittal_id
      WHERE cti.document_id = $1
      ORDER BY ct.transmittal_date DESC NULLS LAST, ct.id DESC
      LIMIT 1
    `,
    [documentId]
  );

  return {
    document,
    revisions: revisionsResult.rows,
    latestTransmittal: transmittalResult.rows[0] || null,
  };
}

async function drawText(page, font, text, x, y, size = 9, options = {}) {
  page.drawText(safeText(text), {
    x,
    y,
    size,
    font,
    color: options.color || rgb(0, 0, 0),
    maxWidth: options.maxWidth,
    lineHeight: options.lineHeight || size + 2,
  });
}

/*
 * FORMOSSA / PROJECT TEMPLATE ADAPTER
 *
 * For the uploaded ADNOC/Sulzer sample, the exact coordinates below
 * should be adjusted once against the supplied blank template PDF.
 *
 * The important architectural point is that coordinates belong to the
 * project template adapter, not to the global document workflow.
 */
async function applyTemplateOverlay(pdfDoc, page, data, fonts) {
  const { regular, bold } = fonts;
  const { document, revisions, latestTransmittal } = data;

  const width = page.getWidth();
  const height = page.getHeight();

  // Small white rectangles hide the corresponding placeholder text
  // before live values are written. Keep these coordinates specific
  // to the selected project template.
  const cover = {
    projectTitle: { x: 115, y: height - 34, size: 8.5, width: 360 },
    projectNumber: { x: 115, y: height - 48, size: 8.5, width: 360 },
    documentTitle: { x: 115, y: height - 72, size: 8.2, width: 360 },
    customerDocumentNo: { x: 115, y: height - 96, size: 8, width: 360 },
    revision: { x: 465, y: height - 90, size: 8.5, width: 35 },
    pageNumber: { x: 465, y: height - 106, size: 8.5, width: 35 },
  };

  // The uploaded sample has a fixed header. Project metadata is placed
  // into the corresponding header cells.
  await drawText(
    page,
    bold,
    document.project_name,
    cover.projectTitle.x,
    cover.projectTitle.y,
    cover.projectTitle.size,
    { maxWidth: cover.projectTitle.width }
  );

  await drawText(
    page,
    bold,
    `PROJECT NO.: ${document.project_code}`,
    cover.projectNumber.x,
    cover.projectNumber.y,
    cover.projectNumber.size,
    { maxWidth: cover.projectNumber.width }
  );

  await drawText(
    page,
    bold,
    document.title,
    cover.documentTitle.x,
    cover.documentTitle.y,
    cover.documentTitle.size,
    { maxWidth: cover.documentTitle.width }
  );

  await drawText(
    page,
    regular,
    document.customer_document_number || document.document_number,
    cover.customerDocumentNo.x,
    cover.customerDocumentNo.y,
    cover.customerDocumentNo.size,
    { maxWidth: cover.customerDocumentNo.width }
  );

  await drawText(
    page,
    bold,
    document.current_revision_code,
    cover.revision.x,
    cover.revision.y,
    cover.revision.size,
    { maxWidth: cover.revision.width }
  );

  await drawText(
    page,
    regular,
    "1 of 1",
    cover.pageNumber.x,
    cover.pageNumber.y,
    cover.pageNumber.size,
    { maxWidth: cover.pageNumber.width }
  );

  /*
   * Revision table:
   * The sample uses REV / DATE / DESCRIPTION / PRP'D / CHK'D / APP'D.
   *
   * V1 writes the live revision history into a dedicated lower table.
   * Exact coordinates should be tuned to the final blank template.
   */
  const tableX = 45;
  const tableTop = 245;
  const rowHeight = 22;
  const columns = [45, 82, 155, 330, 390, 450, 510];

  page.drawText("REVISION HISTORY", {
    x: tableX,
    y: tableTop + 10,
    size: 9,
    font: bold,
  });

  const rows = revisions.slice().reverse().slice(0, 8);

  rows.forEach((revision, index) => {
    const y = tableTop - index * rowHeight;

    const values = [
      revision.revision_code,
      formatDate(revision.revision_date),
      revision.issue_purpose || revision.revision_stage,
      "",
      "",
      "",
    ];

    values.forEach((value, columnIndex) => {
      drawText(
        page,
        regular,
        value,
        columns[columnIndex] + 3,
        y,
        7.5,
        { maxWidth: columns[columnIndex + 1] - columns[columnIndex] - 6 }
      );
    });
  });

  if (latestTransmittal) {
    await drawText(
      page,
      regular,
      latestTransmittal.transmittal_reference,
      350,
      120,
      7.5,
      { maxWidth: 150 }
    );
  }
}

async function generateCoverPage(documentId, res) {
  const data = await getCoverPageData(documentId);
  const projectCode = data.document.project_code;

  const templatePath = templatePathForProject(projectCode);

  if (!fs.existsSync(templatePath)) {
    const error = new Error(
      `No cover page template configured for project ${projectCode}`
    );
    error.statusCode = 409;
    throw error;
  }

  const templateBytes = fs.readFileSync(templatePath);
  const pdfDoc = await PDFDocument.load(templateBytes);

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = pdfDoc.getPages();

  if (pages.length === 0) {
    const error = new Error("Cover page template contains no pages");
    error.statusCode = 500;
    throw error;
  }

  await applyTemplateOverlay(pdfDoc, pages[0], data, {
    regular,
    bold,
  });

  const output = await pdfDoc.save();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="cover-page-${data.document.document_number}.pdf"`
  );

  res.send(Buffer.from(output));
}

module.exports = {
  getCoverPageData,
  generateCoverPage,
};
