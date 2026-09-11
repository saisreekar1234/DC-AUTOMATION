# Excel Document Register Import — V1

## What it does

- Admin uploads `.xlsx`, `.xlsm`, or `.xls` to a selected project.
- Reads the `INTERNAL MDR` sheet.
- Uses the actual Excel document structure:
  - column 14 = DOCUMENT TITLE
  - column 40 = Supplier/Vendor Document Number
  - column 43 = Saipem/Customer Document Number
  - column 44 = Vendor Name
  - column 11 = Revision Number
  - columns 58–105 = revision-by-revision tracking.
- Creates or updates documents instead of creating duplicates.
- Creates historical revision records when revision blocks contain data.
- Sets the latest imported revision as `documents.current_revision_id`.

## Backend

1. Run `database/010_excel_document_register_import.sql`.
2. Install `xlsx` in the backend:
   `npm install xlsx`
3. Copy the service/controller/route files into `backend/src/...`.
4. In `server.js` add:

```js
const excelDocumentImportRoutes = require("./routes/excelDocumentImportRoutes");
app.use("/api/document-register-import", excelDocumentImportRoutes);
```

## Frontend

Copy `DocumentRegisterImport.jsx` into `frontend/src/components/`.

In `Projects.jsx`:

```jsx
import DocumentRegisterImport from "./DocumentRegisterImport";
```

Inside the project documents section, above `<DocumentRegister ... />`:

```jsx
<DocumentRegisterImport
  project={project}
  onImported={loadDocuments}
/>
```

This component is admin-only.
