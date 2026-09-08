# Cover Page Creation V1 — Integration

This package is the next implementation layer for the project-specific Cover Page module.

## 1. Database

Run:

```sql
database/009_cover_page_designer.sql
```

It adds JSON configuration columns to the existing `project_cover_page_templates` table:
- `layout_config`
- `field_mappings`
- `table_mappings`
- `logo_config`

The existing one-active-template-per-project design is preserved.

## 2. Backend files

Copy:
- `backend/src/services/projectCoverPageConfigService.js`
- `backend/src/controllers/projectCoverPageConfigController.js`
- `backend/src/routes/projectCoverPageConfigRoutes.js`
- `backend/src/services/coverPageService.js`
- `backend/src/controllers/projectCoverPageTemplateController.js`
- `backend/src/services/projectCoverPageTemplateService.js`

The template upload controller is now administrator-only.

## 3. Server route

In `backend/src/server.js`, add:

```js
const projectCoverPageConfigRoutes = require("./routes/projectCoverPageConfigRoutes");
app.use("/api/project-cover-page-configs", projectCoverPageConfigRoutes);
```

Keep the existing template route:

```js
const projectCoverPageTemplateRoutes = require("./routes/projectCoverPageTemplateRoutes");
app.use("/api/project-cover-page-templates", projectCoverPageTemplateRoutes);
```

## 4. PDF dependency

From `backend`:

```bash
npm install pdf-lib
```

## 5. Frontend

Copy:
- `frontend/src/components/CoverPageDesigner.jsx`
- `frontend/src/components/cover-page-designer.css`
- `frontend/src/components/ProjectCoverPageSettings.jsx`

The replacement `ProjectCoverPageSettings.jsx` is administrator-controlled for template upload and designer configuration.

Your existing `Projects.jsx` already renders `ProjectCoverPageSettings` in the Cover Page tab. Replace the existing component with the supplied version.

## 6. Runtime behavior

A user generates a cover page from the document screen using:

`GET /api/documents/:id/cover-page`

The renderer:
1. Reads the document and its actual current revision.
2. Reads the active project template.
3. Reads the project's field mappings.
4. Populates only the configured fields.
5. Reads actual revision history from PostgreSQL.
6. Reads current-revision signature names when available.
7. Returns the generated PDF.

## 7. Coordinate system

PDF coordinates use the standard PDF origin: bottom-left.

`x` and `y` are points. `width`, `height`, and `fontSize` are also points.

The designer currently edits numeric coordinates. A later iteration can add drag-and-drop positioning directly over a rendered PDF.

## 8. Important template rule

Use a clean approved blank template for production. The two uploaded completed PDFs are reference examples, not production templates, because they contain real revision/signature information.
