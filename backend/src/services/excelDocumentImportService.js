const fs = require("fs/promises");
const XLSX = require("xlsx");
const pool = require("../config/database");

const HEADER_ROW = 8;
const DATA_START_ROW = 9;

function clean(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function dateValue(value) {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function approvalStatus(code) {
  const value = String(code || "").toUpperCase();
  if (value.includes("SCF") || value.includes("CODE A")) return "APPROVED";
  if (value.includes("CODE B") || value.includes("CODE C")) return "COMMENTED";
  if (value.includes("CODE I")) return "INFORMATION";
  return null;
}

function rowObject(values) {
  const get = (column) => values[column - 1];
  return {
    company_project_code: clean(get(1)),
    company_feed_document_number: clean(get(2)),
    project_code: clean(get(3)),
    system_unit: clean(get(4)),
    originator_code: clean(get(5)),
    discipline: clean(get(6)),
    document_type: clean(get(7)),
    sequence_number: clean(get(8)),
    sheet_number: clean(get(9)),
    language: clean(get(10)),
    revision_number: clean(get(11)),
    serial_number: get(12),
    sulzer_document_number: clean(get(13)),
    document_title: clean(get(14)),
    engineering_discipline: clean(get(15)),
    wbs_level_7: clean(get(16)),
    contractor_document_type: clean(get(17)),
    work_area: clean(get(21)),
    awp_number: clean(get(22)),
    document_category: clean(get(23)),
    office_responsible: clean(get(24)),
    notes: clean(get(26)),
    reason_for_issue: clean(get(27)),
    issuing_department: clean(get(30)),
    managing_department: clean(get(31)),
    sdr_code: clean(get(32)),
    dfo_category: clean(get(33)),
    integrity_critical: clean(get(34)),
    as_built_required: clean(get(35)),
    native_format_required: clean(get(36)),
    original_purchase_order: clean(get(37)),
    planned_first_issue_date: dateValue(get(38)),
    planned_last_issue_date: dateValue(get(39)),
    vendor_document_number: clean(get(40)) || clean(get(13)),
    excel_document_type: clean(get(41)),
    sdr_cover_sheet: clean(get(42)),
    customer_document_number: clean(get(43)),
    vendor_name: clean(get(44)),
    responsible_person: clean(get(45)),
    ore_target_date: dateValue(get(46)),
    remarks: clean(get(47)),
    current_status: clean(get(48)),
    submission_date: dateValue(get(49)),
    current_revision: clean(get(11)),
    current_document_status: clean(get(57)),
    current_approval_code: clean(get(56)),
    sulzer_submitted_date: dateValue(get(52)),
    latest_transmittal: clean(get(53)),
    customer_returned_date: dateValue(get(54)),
    customer_transmittal: clean(get(55)),
    revision_history: buildRevisionHistory(values),
  };
}

function buildRevisionHistory(values) {
  // Actual INTERNAL MDR layout: A = columns 58-66, B = 67-75,
  // C-H = five-column blocks starting at 76, 81, 86, 91, 96, 101.
  const blocks = {
    A: [58, 59, 60, 61, 62, 63, 64, 65, 66],
    B: [67, 68, 69, 70, 71, 72, 73, 74, 75],
    C: [76, 77, null, null, 78, null, 78, 79, 80],
    D: [81, 82, null, null, 83, null, 83, 84, 85],
    E: [86, 87, null, null, 88, null, 88, 89, 90],
    F: [91, 92, null, null, 93, null, 93, 94, 95],
    G: [96, 97, null, null, 98, null, 98, 99, 100],
    H: [101, 102, null, null, 103, null, 103, 104, 105],
  };

  return Object.entries(blocks).map(([code, columns]) => {
    const vals = columns.map((column) => column ? values[column - 1] : null);
    const submissionDate = dateValue(vals[0]);
    const submissionTransmittal = clean(vals[1]);
    const customerReceivedDate = dateValue(vals[4] || vals[6]);
    const customerTransmittal = clean(vals[7]);
    const approvalCode = clean(vals[8]);
    const hasData = [submissionDate, submissionTransmittal, customerReceivedDate, customerTransmittal, approvalCode].some(Boolean);
    if (!hasData) return null;

    const status = approvalStatus(approvalCode);
    return {
      revision_code: code,
      revision_date: customerReceivedDate || submissionDate,
      submission_date: submissionDate,
      submission_transmittal: submissionTransmittal,
      customer_received_date: customerReceivedDate,
      customer_transmittal: customerTransmittal,
      approval_code: approvalCode,
      status,
      revision_stage: status === "APPROVED" ? "APPROVED" : "REVIEW",
    };
  }).filter(Boolean);
}

function findSheet(workbook) {
  const exact = workbook.SheetNames.find((name) => String(name).trim().toUpperCase() === "INTERNAL MDR");
  if (exact) return exact;
  const candidate = workbook.SheetNames.find((name) => String(name).toUpperCase().includes("INTERNAL MDR"));
  if (candidate) return candidate;
  throw new Error("INTERNAL MDR sheet was not found in the Excel workbook");
}

async function importWorkbook(projectId, filePath, originalFileName, userId) {
  const workbook = XLSX.readFile(filePath, { cellDates: true, raw: true });
  const sheetName = findSheet(workbook);
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true });

  const dataRows = rows.slice(DATA_START_ROW - 1);
  const client = await pool.connect();
  const summary = { project_id: Number(projectId), sheet: sheetName, total_rows: 0, imported: 0, updated: 0, skipped: 0, revisions_created: 0, errors: [] };

  try {
    await client.query("BEGIN");

    const projectResult = await client.query(`SELECT id, project_code FROM projects WHERE id = $1 LIMIT 1`, [projectId]);
    if (!projectResult.rows.length) throw new Error("Project not found");

    for (let index = 0; index < dataRows.length; index += 1) {
      const excelRow = DATA_START_ROW + index;
      const values = dataRows[index];
      const item = rowObject(values);
      if (!item.customer_document_number && !item.vendor_document_number && !item.sulzer_document_number) {
        summary.skipped += 1;
        continue;
      }

      const documentNumber = item.customer_document_number || item.vendor_document_number || item.sulzer_document_number;
      if (!documentNumber || !item.document_title) {
        summary.skipped += 1;
        continue;
      }
      summary.total_rows += 1;

      const existingResult = await client.query(
        `SELECT id FROM documents WHERE project_id = $1 AND document_number = $2 LIMIT 1`,
        [projectId, documentNumber]
      );

      let documentId;
      if (existingResult.rows.length) {
        documentId = existingResult.rows[0].id;
        await client.query(
          `UPDATE documents SET
             title = COALESCE($1, title),
             vendor_document_number = COALESCE($2, vendor_document_number),
             customer_document_number = COALESCE($3, customer_document_number),
             document_type = COALESCE($4, document_type),
             vendor_name = $5,
             engineering_discipline = $6,
             system_unit = $7,
             originator_code = $8,
             company_feed_document_number = $9,
             source_project_code = $10,
             responsible_person = $11,
             excel_source_row = $12,
             legacy_metadata = $13::jsonb,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $14`,
          [item.document_title, item.vendor_document_number, item.customer_document_number, item.excel_document_type || item.document_type,
           item.vendor_name, item.engineering_discipline, item.system_unit, item.originator_code, item.company_feed_document_number,
           item.company_project_code, item.responsible_person, excelRow, JSON.stringify(item), documentId]
        );
        summary.updated += 1;
      } else {
        const insert = await client.query(
          `INSERT INTO documents (
             project_id, document_number, title, vendor_document_number, customer_document_number,
             document_type, vendor_name, engineering_discipline, system_unit, originator_code,
             company_feed_document_number, source_project_code, responsible_person, excel_source_row,
             legacy_metadata, is_active
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15::jsonb,TRUE)
           RETURNING id`,
          [projectId, documentNumber, item.document_title, item.vendor_document_number, item.customer_document_number,
           item.excel_document_type || item.document_type, item.vendor_name, item.engineering_discipline, item.system_unit,
           item.originator_code, item.company_feed_document_number, item.company_project_code, item.responsible_person,
           excelRow, JSON.stringify(item)]
        );
        documentId = insert.rows[0].id;
        summary.imported += 1;
      }

      const history = item.revision_history;
      for (let h = 0; h < history.length; h += 1) {
        const revision = history[h];
        const existingRevision = await client.query(
          `SELECT id FROM revisions WHERE document_id = $1 AND revision_code = $2 LIMIT 1`,
          [documentId, revision.revision_code]
        );
        if (existingRevision.rows.length) continue;

        const maxSeq = await client.query(
          `SELECT COALESCE(MAX(sequence_order),0) + 1 AS next_sequence FROM revisions WHERE document_id = $1`,
          [documentId]
        );
        const status = revision.status || item.current_status || "IMPORTED";
        const created = await client.query(
          `INSERT INTO revisions (
             document_id, revision_code, sequence_order, revision_stage, issue_purpose,
             status, reason_for_issue, revision_date, created_by
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, revision_code`,
          [documentId, revision.revision_code, maxSeq.rows[0].next_sequence, revision.revision_stage,
           item.reason_for_issue, status, item.reason_for_issue, revision.revision_date || item.submission_date, userId || null]
        );
        summary.revisions_created += 1;
      }

      // If no revision block existed, create the Excel row's current revision as a single historical record.
      if (!history.length && item.current_revision) {
        const exists = await client.query(`SELECT id FROM revisions WHERE document_id = $1 AND revision_code = $2 LIMIT 1`, [documentId, item.current_revision]);
        if (!exists.rows.length) {
          const maxSeq = await client.query(`SELECT COALESCE(MAX(sequence_order),0) + 1 AS next_sequence FROM revisions WHERE document_id = $1`, [documentId]);
          const status = approvalStatus(item.current_approval_code) || item.current_status || "IMPORTED";
          const stage = status === "APPROVED" ? "APPROVED" : "REVIEW";
          const created = await client.query(
            `INSERT INTO revisions (document_id, revision_code, sequence_order, revision_stage, issue_purpose, status, reason_for_issue, revision_date, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [documentId, item.current_revision, maxSeq.rows[0].next_sequence, stage, item.reason_for_issue, status, item.reason_for_issue, item.submission_date, userId || null]
          );
          summary.revisions_created += 1;
        }
      }

      // The Excel column 11 (Revision Number) is the authoritative current revision.
      // Do not assume the last populated A-H block is current.
      let current;
      if (item.current_revision) {
        current = await client.query(
          `SELECT id FROM revisions WHERE document_id = $1 AND revision_code = $2 ORDER BY sequence_order DESC LIMIT 1`,
          [documentId, item.current_revision]
        );
      }
      if (!current || !current.rows.length) {
        current = await client.query(
          `SELECT id FROM revisions WHERE document_id = $1 ORDER BY sequence_order DESC LIMIT 1`,
          [documentId]
        );
      }
      if (current.rows.length) {
        await client.query(`UPDATE documents SET current_revision_id = $1 WHERE id = $2`, [current.rows[0].id, documentId]);
      }
    }

    await client.query("COMMIT");
    return summary;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    try { await fs.unlink(filePath); } catch (_) {}
  }
}

module.exports = { importWorkbook };
