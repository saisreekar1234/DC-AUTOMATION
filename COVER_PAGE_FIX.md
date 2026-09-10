# Cover Page — verified setup

The existing frontend call is correct: `GET /api/documents/:id/cover-page` and it requests a PDF blob.

The important production requirement is that the active project template must exist on the backend filesystem and be the blank/redacted template. The generated blank template is included as `cover-page-template.pdf`.

## Use this template

Do NOT use the completed `ExtractPage1(1).pdf` as the production template. That PDF contains actual project/document data, Rev B, revision history and signatures. Use the blank/redacted template instead.

## Required backend location

The current cover engine resolves the project template by project code under:

backend/templates/cover-pages/<PROJECT_CODE>/cover-page.pdf

For example, if the project's code is `Formossa`, the safe path is:

backend/templates/cover-pages/Formossa/cover-page.pdf

The project cover-page upload screen should place the uploaded PDF there and keep the same path in `project_cover_page_templates.template_file_path`.

## Verification sequence

1. Start backend.
2. Open the project.
3. Open Cover Page.
4. Upload `cover-page-template.pdf`.
5. Open Cover Page Designer.
6. Select a real project document.
7. Save Configuration.
8. Click Preview PDF.
9. From Document Details, click Generate Cover Page PDF.

The generated PDF must use the selected project's template and current database revision; it must not fabricate revision numbers in React.

If step 8 or 9 fails, copy the first backend error printed by Node. That error identifies whether the remaining issue is the template file, PDF parsing, database data, or PDF generation.
