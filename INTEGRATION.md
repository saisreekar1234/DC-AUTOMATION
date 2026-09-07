# Cover Page Template Upload — Integration

## Frontend
Copy these files into `frontend/src/components/`:

- `Projects.jsx`
- `ProjectCoverPageSettings.jsx`
- `project-cover-page.css`

`Projects.jsx` contains the existing Overview, Documents, Transmittals, Workflow and Team tabs, plus the admin-only Cover Page tab.

## Backend
Copy these files into the matching `backend/src/` folders:

- `routes/projectCoverPageTemplateRoutes.js`
- `controllers/projectCoverPageTemplateController.js`
- `services/projectCoverPageTemplateService.js`

In `backend/src/server.js`, add:

```js
const projectCoverPageTemplateRoutes =
  require("./routes/projectCoverPageTemplateRoutes");

app.use(
  "/api/project-cover-page-templates",
  projectCoverPageTemplateRoutes
);
```

The route path is relative to `server.js`, which is already inside `src`.

## Database
Run:

```sql
backend/sql/project_cover_page_template_upload.sql
```

## Storage
The service stores the active project template at:

```text
backend/templates/cover-pages/<PROJECT_CODE>/cover-page.pdf
```

The `templates/cover-pages` directory is created automatically when a template is uploaded.

## Frontend dependencies
No new frontend package is required for the upload UI.

## Backend dependencies
The template upload route uses the existing `multer` dependency. If it is not already installed:

```bash
npm install multer
```

## Usage
1. Login as an admin.
2. Open Projects.
3. Open a project.
4. Select `Cover Page`.
5. Click `Upload Template`.
6. Select the approved blank project PDF.

The template is project-specific. Re-uploading replaces the active template and increments its version.
