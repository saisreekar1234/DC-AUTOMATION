const fs = require("fs");
const { PDFParse } = require("pdf-parse");


// ======================================================
// 1. EXTRACT TEXT FROM PDF
// ======================================================

async function extractPdfText(filePath) {
  const pdfBuffer = fs.readFileSync(filePath);

  const parser = new PDFParse({
    data: pdfBuffer,
  });

  try {
    const result = await parser.getText();

    return {
      text: result.text,
      pages: result.total,
    };

  } finally {
    await parser.destroy();
  }
}


// ======================================================
// 2. EXTRACT TRANSMITTAL HEADER
// ======================================================

function extractTransmittalHeader(text) {

  // ----------------------------------------------------
  // Customer
  // ----------------------------------------------------

  const customerMatch = text.match(
    /FORMOSA PETROCHEMICAL CORPORATION/i
  );


  // ----------------------------------------------------
  // Date
  //
  // Example:
  // Date : 2026/07/21
  // ----------------------------------------------------

  const dateMatch = text.match(
    /Date\s*:\s*(\d{4}[\/-]\d{2}[\/-]\d{2})/i
  );


  // ----------------------------------------------------
  // Transmittal Reference
  //
  // Handles:
  //
  // FPCC-T-SULZER-035
  //
  // FPCC-T-SULZER- 035
  // ----------------------------------------------------

  const referenceMatch = text.match(
    /Ref\s*No\s*:\s*([A-Z0-9-]+)\s*(\d+)\b/i
  );

  let transmittalReference = null;

  if (referenceMatch) {
    transmittalReference =
      `${referenceMatch[1]}${referenceMatch[2]}`;
  }


  // ----------------------------------------------------
  // Project
  //
  // Example:
  // Project : RDS DHDT
  // ----------------------------------------------------

  const projectMatch = text.match(
    /Project\s*:\s*(.+?)(?=\s+Attn\.|\s+Ref\s+No|\n)/i
  );


  return {
    customer_name: customerMatch
      ? "FORMOSA PETROCHEMICAL CORPORATION"
      : null,

    project_name: projectMatch
      ? projectMatch[1].trim()
      : null,

    transmittal_date: dateMatch
      ? dateMatch[1].replace(/\//g, "-")
      : null,

    transmittal_reference:
      transmittalReference,
  };
}


// ======================================================
// 3. EXTRACT DOCUMENT ROWS
// ======================================================

function extractDocumentRows(text) {

  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);


  const rows = [];

  let currentRow = null;


  // ----------------------------------------------------
  // Process PDF lines
  // ----------------------------------------------------

  for (const line of lines) {

    // --------------------------------------------------
    // Stop at the explanatory section
    // --------------------------------------------------

    if (
      line.startsWith("Document/") ||
      line.startsWith("PURPOSE") ||
      line.startsWith("Please acknowledge") ||
      line.startsWith("RECEIVED")
    ) {

      break;
    }


    // --------------------------------------------------
    // Detect a new document row
    //
    // Example:
    //
    // 1 501237-2002 04 System Overview Diagram 1E C
    //
    // 2 501237-2005 04 Cabinet Layout Drawings 1E A
    // --------------------------------------------------

    const rowStartMatch = line.match(
      /^(\d+)\s+(\S+)\s+(\S+)\s+(.+)$/
    );


    if (rowStartMatch) {

      // Save the previous row
      if (currentRow) {
        rows.push(currentRow);
      }


      currentRow = {

        item_number:
          Number(rowStartMatch[1]),

        document_number:
          rowStartMatch[2],

        revision:
          rowStartMatch[3],

        raw_description:
          rowStartMatch[4],
      };


      continue;
    }


    // --------------------------------------------------
    // Continuation line
    //
    // Example:
    //
    // 3 501237-2006 04 Cabinet Power Consumption and
    //
    // Heat Dissipation 1E A
    //
    // The second line belongs to row 3.
    // --------------------------------------------------

    if (currentRow) {

      currentRow.raw_description +=
        " " + line;
    }
  }


  // ----------------------------------------------------
  // Save the final row
  // ----------------------------------------------------

  if (currentRow) {
    rows.push(currentRow);
  }


  // ----------------------------------------------------
  // Convert raw rows into structured rows
  // ----------------------------------------------------

  const structuredRows = [];


  for (const row of rows) {

    const combinedDescription =
      row.raw_description
        .replace(/\s+/g, " ")
        .trim();


    // --------------------------------------------------
    // Every row ends with:
    //
    // 1E C
    // 1E A
    //
    // where:
    //
    // 1E = quantity/nature
    // A/C/I = purpose
    // --------------------------------------------------

    const endingMatch =
      combinedDescription.match(
        /\s+(\S+)\s+([ACI])$/
      );


    if (!endingMatch) {

      // If the row does not contain a valid
      // purpose code, ignore it for now.
      continue;
    }


    const quantityOrNature =
      endingMatch[1];


    const purposeCode =
      endingMatch[2];


    const description =
      combinedDescription
        .slice(
          0,
          endingMatch.index
        )
        .trim();


    structuredRows.push({

      item_number:
        row.item_number,

      document_number:
        row.document_number,

      revision:
        row.revision,

      description:
        description,

      quantity_or_nature:
        quantityOrNature,

      purpose_code:
        purposeCode,
    });
  }


  return structuredRows;
}


// ======================================================
// 4. EXPORT FUNCTIONS
// ======================================================

module.exports = {

  extractPdfText,

  extractTransmittalHeader,

  extractDocumentRows,

};