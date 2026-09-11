const XLSX = require("xlsx");
const pool = require("../config/database");

function clean(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value) {
  return clean(value)
    .toLowerCase()
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[.*()_*]/g, "")
    .trim();
}

function findHeaderRow(rows) {
  const required = [
    "company feed document number",
    "sulzer docunt number",
    "document title",
    "revision number",
    "current status",
  ];

  let bestRow = -1;
  let bestScore = 0;

  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const headers = (rows[i] || []).map(normalizeHeader);
    let score = 0;

    for (const target of required) {
      if (
        headers.some(
          (h) => h === target || h.includes(target)
        )
      ) {
        score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestRow = i;
    }
  }

  if (bestScore < 3) {
    throw new Error(
      "Unable to identify the MDR header row. Please use the INTERNAL MDR sheet."
    );
  }

  return bestRow;
}

function findColumn(headers, aliases) {
  const normalized = headers.map(normalizeHeader);

  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const exact = normalized.findIndex((h) => h === target);
    if (exact >= 0) return exact;
  }

  for (const alias of aliases) {
    const target = normalizeHeader(alias);
    const partial = normalized.findIndex(
      (h) => h.includes(target) || target.includes(h)
    );
    if (partial >= 0) return partial;
  }

  return -1;
}

function cell(row, index) {
  return index >= 0 ? clean(row[index]) : "";
}

function parseWorkbook(buffer) {
  const workbook = XLSX.read(buffer, {
    type: "buffer",
    cellDates: true,
    raw: false,
    WTF: false,
  });

  if (!workbook.SheetNames.length) {
    throw new Error("The Excel workbook contains no sheets.");
  }

  const sheetName =
    workbook.SheetNames.find(
      (name) => normalizeHeader(name) === "internal mdr"
    ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerRowIndex = findHeaderRow(rows);
  const headers = rows[headerRowIndex] || [];

  const columns = {
    companyFeedDocumentNumber: findColumn(headers, [
      "COMPANY FEED DOCUMENT NUMBER",
      "Customer Document Number",
    ]),
    internalDocumentNumber: findColumn(headers, [
      "Sulzer Docunt Number",
      "Sulzer Document Number",
      "Saipem Document Number",
    ]),
    title: findColumn(headers, [
      "DOCUMENT TITLE",
      "Document Title",
    ]),
    vendorDocumentNumber: findColumn(headers, [
      "Supplier Document Number",
      "Vendor Document Number",
    ]),
    revision: findColumn(headers, [
      "Revision Number (*)",
      "Revision Number",
    ]),
    currentStatus: findColumn(headers, [
      "Current Status",
      "Current Document Status",
    ]),
    approvalCode: findColumn(headers, [
      "Approval Code",
    ]),
    reasonForIssue: findColumn(headers, [
      "Reason for Issue",
    ]),
    documentType: findColumn(headers, [
      "Document Type (*)",
      "Document Type",
    ]),
    discipline: findColumn(headers, [
      "Discipline (*)",
      "Discipline",
    ]),
    systemUnit: findColumn(headers, [
      "System/Unit (*)",
      "System Unit",
    ]),
    lineNumber: findColumn(headers, [
      "Sequence Number",
    ]),
  };

  const parsedRows = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i] || [];

    const companyFeed = cell(
      row,
      columns.companyFeedDocumentNumber
    );
    const internalNumber = cell(
      row,
      columns.internalDocumentNumber
    );
    const title = cell(row, columns.title);
    const vendor = cell(
      row,
      columns.vendorDocumentNumber
    );
    const revision = cell(row, columns.revision);
    const currentStatus = cell(
      row,
      columns.currentStatus
    );

    if (!companyFeed && !internalNumber && !title) {
      continue;
    }

    const documentNumber =
      internalNumber || companyFeed;

    if (!documentNumber) {
      continue;
    }

    parsedRows.push({
      row_number: i + 1,
      document_number: documentNumber,
      title: title || "Untitled document",
      vendor_document_number: vendor || null,
      customer_document_number: companyFeed || null,
      document_type:
        cell(row, columns.documentType) || null,
      line_number:
        cell(row, columns.lineNumber) || null,
      revision_code: revision || null,
      current_status: currentStatus || null,
      approval_code:
        cell(row, columns.approvalCode) || null,
      reason_for_issue:
        cell(row, columns.reasonForIssue) || null,
      discipline:
        cell(row, columns.discipline) || null,
      system_unit:
        cell(row, columns.systemUnit) || null,
    });
  }

  return {
    sheet_name: sheetName,
    header_row: headerRowIndex + 1,
    rows: parsedRows,
  };
}

function importedStage(currentStatus, approvalCode) {
  const value = `${currentStatus || ""} ${approvalCode || ""}`.toUpperCase();

  if (
    value.includes("APPROVED") ||
    value.includes("ISSUED FOR USE") ||
    value.includes("FINAL") ||
    value.includes("SCF")
  ) {
    return "APPROVED";
  }

  return "REVIEW";
}

function importedStatus(currentStatus, approvalCode) {
  return clean(currentStatus) || clean(approvalCode) || "Imported";
}

async function importRows(projectId, rows, userId) {
  const client = await pool.connect();

  const result = {
    created_documents: 0,
    updated_documents: 0,
    created_revisions: 0,
    unchanged_revisions: 0,
    skipped_rows: 0,
    errors: [],
  };

  try {
    await client.query("BEGIN");

    for (const row of rows) {
      try {
        const existing = await client.query(
          `
          SELECT id, current_revision_id
          FROM documents
          WHERE project_id = $1
            AND document_number = $2
          LIMIT 1
          FOR UPDATE
          `,
          [projectId, row.document_number]
        );

        let document;

        if (existing.rows.length === 0) {
          const inserted = await client.query(
            `
            INSERT INTO documents (
              project_id,
              document_number,
              title,
              vendor_document_number,
              customer_document_number,
              document_type,
              line_number
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7)
            RETURNING *
            `,
            [
              projectId,
              row.document_number,
              row.title,
              row.vendor_document_number,
              row.customer_document_number,
              row.document_type,
              row.line_number,
            ]
          );

          document = inserted.rows[0];
          result.created_documents++;
        } else {
          const updated = await client.query(
            `
            UPDATE documents
            SET
              title = $1,
              vendor_document_number = $2,
              customer_document_number = $3,
              document_type = $4,
              line_number = $5,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
            `,
            [
              row.title,
              row.vendor_document_number,
              row.customer_document_number,
              row.document_type,
              row.line_number,
              existing.rows[0].id,
            ]
          );

          document = updated.rows[0];
          result.updated_documents++;
        }

        if (!row.revision_code) continue;

        const existingRevision = await client.query(
          `
          SELECT *
          FROM revisions
          WHERE document_id = $1
            AND revision_code = $2
          ORDER BY sequence_order DESC
          LIMIT 1
          `,
          [document.id, row.revision_code]
        );

        let revision;

        if (existingRevision.rows.length > 0) {
          revision = existingRevision.rows[0];
          result.unchanged_revisions++;
        } else {
          const sequence = await client.query(
            `
            SELECT COALESCE(MAX(sequence_order), 0) + 1
              AS next_sequence
            FROM revisions
            WHERE document_id = $1
            `,
            [document.id]
          );

          const revisionStage = importedStage(
            row.current_status,
            row.approval_code
          );

          const revisionStatus = importedStatus(
            row.current_status,
            row.approval_code
          );

          const insertedRevision = await client.query(
            `
            INSERT INTO revisions (
              document_id,
              revision_code,
              sequence_order,
              revision_stage,
              stage,
              issue_purpose,
              status,
              reason_for_issue,
              revision_date,
              created_by
            )
            VALUES (
              $1,$2,$3,$4,$5,$6,$7,$8,CURRENT_DATE,$9
            )
            RETURNING *
            `,
            [
              document.id,
              row.revision_code,
              Number(sequence.rows[0].next_sequence),
              revisionStage,
              revisionStage,
              row.reason_for_issue || "Imported from MDR",
              revisionStatus,
              row.reason_for_issue || null,
              userId || null,
            ]
          );

          revision = insertedRevision.rows[0];
          result.created_revisions++;
        }

        await client.query(
          `
          UPDATE documents
          SET
            current_revision_id = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          `,
          [revision.id, document.id]
        );
      } catch (rowError) {
        result.skipped_rows++;
        result.errors.push({
          row_number: row.row_number,
          document_number: row.document_number,
          message: rowError.message,
        });
      }
    }

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function importExcel(buffer, projectId, userId) {
  if (!buffer) {
    throw new Error("Excel file is required.");
  }

  const parsed = parseWorkbook(buffer);

  if (!parsed.rows.length) {
    throw new Error(
      "No document rows were found in the INTERNAL MDR sheet."
    );
  }

  return {
    sheet_name: parsed.sheet_name,
    header_row: parsed.header_row,
    total_rows: parsed.rows.length,
    ...(await importRows(projectId, parsed.rows, userId)),
  };
}

module.exports = {
  parseWorkbook,
  importExcel,
};
