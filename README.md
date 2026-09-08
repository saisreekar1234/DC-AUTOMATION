# Cover Page Creation V1

This version turns the existing project-specific cover-page upload into a configurable, data-driven Cover Page Creation module.

## Supported dynamic sources

- Project Name
- Project Code
- Client / Customer
- Document Number
- Document Title
- Customer Document Number
- Vendor Document Number
- Document Type
- Current Revision
- Current Stage
- Current Status
- Issue Purpose
- Revision Date
- Latest Transmittal Reference
- Customer Name
- Prepared By
- Reviewed / Checked By
- Approved By

## Supported table

Revision History can be positioned per project and is populated from the real `revisions` records.

## Design principle

The PDF is the visual template. PostgreSQL is the source of truth for document/revision/workflow data. JSON configuration determines which live values are written where.

This allows Mozambique LNG and ADNOC/Sulzer to use different layouts, logos, labels and tables while using the same generation engine.

## Next planned layer

The next iteration should replace numeric X/Y editing with a visual drag-and-drop designer and add configurable logo/image placement and arbitrary table definitions.
