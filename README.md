# Cover Page Template Permission Change

## Permission model

- Admin: can view, upload, and replace the cover-page template for every project.
- Project user/member: can view, upload, and replace the cover-page template for projects they have access to.
- User without project access: cannot view the Cover Page tab through an authorized project and receives HTTP 403 if they call the API directly.

## Important

The current cover-page template is a PDF template, not an Excel file.
Excel-based project configuration can be added later as a separate configuration feature.

## Frontend

Replace:
`frontend/src/components/Projects.jsx`
with the generated `Projects.jsx` file.

Replace:
`frontend/src/components/ProjectCoverPageSettings.jsx`
with the generated file.

Keep:
`frontend/src/components/project-cover-page.css`

## Backend

Copy:
- projectCoverPageTemplateController.js -> backend/src/controllers/
- projectCoverPageTemplateService.js -> backend/src/services/
- projectCoverPageTemplateRoutes.js -> backend/src/routes/

Keep this in backend/src/server.js:

const projectCoverPageTemplateRoutes =
  require("./routes/projectCoverPageTemplateRoutes");

app.use(
  "/api/project-cover-page-templates",
  projectCoverPageTemplateRoutes
);

## Database

Run project_cover_page_template_upload.sql in the same PostgreSQL database used by the application.

## Dependencies

The cover-page generation service uses pdf-lib. Install it in backend if not already installed:

npm install pdf-lib
