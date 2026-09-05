# Documents + Workflow Fix

Replace these files in the existing DC-AUTOMATION project:

- backend/src/controllers/documentController.js
- backend/src/services/documentService.js
- backend/src/services/revisionService.js
- frontend/src/components/Documents.jsx
- frontend/src/components/Projects.jsx

## Fixes

1. Global Documents page no longer requires `project_id`.
2. Administrators can see documents across all projects.
3. Normal users only receive documents from assigned active projects.
4. Project-specific document requests remain scoped by `project_id`.
5. Document list now includes project code/name and the real current revision status/stage.
6. Status filter includes Pending, Submitted, Under Review, Commented, Approved, Rejected, Completed, In Progress and Failed.
7. Project Workflow now loads the project's documents when Project Details opens, so the Document dropdown is populated even when Workflow is opened first.
8. Workflow defaults to the document's actual current revision when available; otherwise it selects the latest returned revision.
9. Revision creation updates `documents.current_revision_id`.
10. Existing documents with a NULL `current_revision_id` fall back to their latest revision for display, without fabricating revision records.
