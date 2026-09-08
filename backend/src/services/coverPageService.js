const fs = require("fs");
const path = require("path");
const { PDFDocument, rgb, StandardFonts } = require("pdf-lib");
const pool = require("../config/database");
const projectCoverPageConfigService = require("./projectCoverPageConfigService");

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
  return value === null || value === undefined || value === "" ? "—" : String(value);
}

function getByPath(root, source) {
  return String(source || "")
    .split(".")
    .reduce((value, key) => value?.[key], root);
}

function valueForSource(source, data) {
  const value = getByPath(data, source);
  if (source?.endsWith("revision_date")) return formatDate(value);
  return safeText(value);
}

function textWidth(font, text, size) {
  return font.widthOfTextAtSize(safeText(text), size);
}

function drawAlignedText(page, font, text, field) {
  const value = safeText(text);
  const size = Number(field.fontSize || 8);
  const x = Number(field.x || 0);
  const y = Number(field.y || 0);
  const width = Number(field.width || 200);
  let drawX = x;
  const measured = textWidth(font, value, size);

  if (field.align === "center") drawX = x + Math.max(0, (width - measured) / 2);
  if (field.align === "right") drawX = x + Math.max(0, width - measured);

  page.drawText(value, {
    x: drawX,
    y,
    size,
    font,
    color: rgb(0, 0, 0),
    maxWidth: width,
  });
}

function whiteoutField(page, field) {
  const width = Number(field.width || 200);
  const height = Number(field.height || 14);
  page.drawRectangle({
    x: Number(field.x || 0) - 1,
    y: Number(field.y || 0) - 2,
    width: width + 2,
    height: height + 4,
    color: rgb(1, 1, 1),
  });
}

async function getCoverPageData(documentId) {
  const documentResult = await pool.query(
    `SELECT
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
       p.client_name,
       cr.id AS revision_id,
       cr.revision_code AS current_revision_code,
       cr.revision_stage AS current_revision_stage,
       cr.status AS current_revision_status,
       cr.issue_purpose AS current_issue_purpose,
       cr.revision_date AS current_revision_date
     FROM documents d
     INNER JOIN projects p ON p.id = d.project_id
     LEFT JOIN revisions cr ON cr.id = d.current_revision_id
     WHERE d.id = $1
     LIMIT 1`,
    [documentId]
  );

  if (!documentResult.rows.length) {
    const error = new Error("Document not found");
    error.statusCode = 404;
    throw error;
  }

  const document = documentResult.rows[0];

  const revisionsResult = await pool.query(
    `SELECT id, revision_code, sequence_order, revision_stage, status, issue_purpose, revision_date
     FROM revisions
     WHERE document_id = $1
     ORDER BY sequence_order ASC, id ASC`,
    [documentId]
  );

  const signaturesResult = document.revision_id
    ? await pool.query(
        `SELECT ds.signature_role, ds.signature_status, ds.signed_by,
                u.name AS signed_by_name
         FROM document_signatures ds
         LEFT JOIN users u ON u.id = ds.signed_by
         WHERE ds.document_id = $1 AND ds.revision_id = $2
         ORDER BY ds.id ASC`,
        [documentId, document.revision_id]
      )
    : { rows: [] };

  const transmittalResult = await pool.query(
    `SELECT ct.id, ct.customer_name, ct.transmittal_reference, ct.transmittal_date,
            cti.customer_revision, cti.purpose_code, cti.response_type,
            cti.response_action, cti.response_processed
     FROM customer_transmittal_items cti
     INNER JOIN customer_transmittals ct ON ct.id = cti.transmittal_id
     WHERE cti.document_id = $1
     ORDER BY ct.transmittal_date DESC NULLS LAST, ct.id DESC
     LIMIT 1`,
    [documentId]
  );

  const signatureMap = {};
  for (const item of signaturesResult.rows) {
    const role = String(item.signature_role || "").toLowerCase();
    let bucket = role.includes("approv") ? "approved_by" : role.includes("check") || role.includes("review") ? "reviewed_by" : role.includes("prep") ? "prepared_by" : null;
    if (bucket && !signatureMap[bucket]) signatureMap[bucket] = item.signed_by_name || "—";
  }

  return {
    document: {
      ...document,
      current_revision_code: document.current_revision_code,
      current_revision_stage: document.current_revision_stage,
      current_revision_status: document.current_revision_status,
    },
    project: {
      project_code: document.project_code,
      project_name: document.project_name,
      client_name: document.client_name,
    },
    revision: {
      revision_code: document.current_revision_code,
      revision_stage: document.current_revision_stage,
      status: document.current_revision_status,
      issue_purpose: document.current_issue_purpose,
      revision_date: document.current_revision_date,
    },
    revisions: revisionsResult.rows,
    signatures: signatureMap,
    latest_transmittal: transmittalResult.rows[0] || null,
  };
}

async function drawRevisionHistory(page, fonts, data, table) {
  const rows = data.revisions || [];
  const columns = table.columns || [
    { key: "revision_code", label: "Revision", width: 45 },
    { key: "revision_date", label: "Date", width: 75 },
    { key: "issue_purpose", label: "Reason for Issue", width: 220 },
  ];
  const x = Number(table.x || 45);
  const y = Number(table.y || 250);
  const rowHeight = Number(table.rowHeight || 18);
  const headerSize = Number(table.headerFontSize || 7);
  const bodySize = Number(table.bodyFontSize || 7);
  let cursorX = x;

  for (const column of columns) {
    page.drawRectangle({ x: cursorX, y: y, width: Number(column.width), height: rowHeight, borderWidth: 0.6, borderColor: rgb(0, 0, 0) });
    page.drawText(safeText(column.label), { x: cursorX + 2, y: y + 5, size: headerSize, font: fonts.bold, maxWidth: Number(column.width) - 4 });
    cursorX += Number(column.width);
  }

  rows.slice().reverse().slice(0, Number(table.maxRows || 8)).forEach((revision, index) => {
    const rowY = y - rowHeight * (index + 1);
    let cellX = x;
    for (const column of columns) {
      const value = column.key === "revision_date" ? formatDate(revision.revision_date) : safeText(revision[column.key]);
      page.drawRectangle({ x: cellX, y: rowY, width: Number(column.width), height: rowHeight, borderWidth: 0.6, borderColor: rgb(0, 0, 0) });
      page.drawText(value, { x: cellX + 2, y: rowY + 5, size: bodySize, font: fonts.regular, maxWidth: Number(column.width) - 4 });
      cellX += Number(column.width);
    }
  });
}

async function applyConfiguredOverlay(pdfDoc, page, data, config) {
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { regular, bold };

  for (const field of config.field_mappings || []) {
    if (field.enabled === false) continue;
    if (field.whiteout) whiteoutField(page, field);
    const sourceValue = valueForSource(field.source, data);
    drawAlignedText(page, field.fontWeight === "bold" ? bold : regular, sourceValue, field);
  }

  for (const table of config.table_mappings || []) {
    if (table.enabled === false) continue;
    if (table.type === "revision_history") {
      await drawRevisionHistory(page, fonts, data, table);
    }
  }
}

async function generateCoverPage(documentId, res) {
  const data = await getCoverPageData(documentId);
  const config = await projectCoverPageConfigService.getActiveConfig(data.document.project_id);
  if (!config) {
    const error = new Error(`No cover page template configured for project ${data.project.project_code}`);
    error.statusCode = 409;
    throw error;
  }

  const templatePath = templatePathForProject(data.project.project_code);
  if (!fs.existsSync(templatePath)) {
    const error = new Error(`No cover page template file found for project ${data.project.project_code}`);
    error.statusCode = 409;
    throw error;
  }

  const pdfDoc = await PDFDocument.load(fs.readFileSync(templatePath));
  const pages = pdfDoc.getPages();
  if (!pages.length) throw new Error("Cover page template contains no pages");

  await applyConfiguredOverlay(pdfDoc, pages[0], data, config);
  const output = await pdfDoc.save();

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="cover-page-${data.document.document_number}.pdf"`);
  res.send(Buffer.from(output));
}

module.exports = { getCoverPageData, generateCoverPage };
