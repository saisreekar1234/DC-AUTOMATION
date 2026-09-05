# DC Automation - Access Control + Project Transmittals Fix

## Problems fixed

1. Normal users were receiving every project because `GET /api/projects` always called `projectService.getProjects()`.
2. A user could potentially open an unassigned project directly by ID.
3. `ProjectTransmittals` was used inside `Projects.jsx` without importing it, causing `ReferenceError: ProjectTransmittals is not defined`.
4. Customer transmittal endpoints were not authenticated/project-scoped.
5. The customer transmittal `/:id/analyse` route appeared after `/:id`, so Express could treat `analyse` as an ID.
6. Non-admin users' global transmittal lists are now limited to their assigned projects.
7. Project creation is now admin-only in the backend and the New Project button is hidden for non-admin users.

## Files changed

### Frontend
- `frontend/src/components/Projects.jsx`

### Backend
- `backend/src/controllers/projectController.js`
- `backend/src/routes/projectRoutes.js`
- `backend/src/services/customerTransmittalService.js`
- `backend/src/controllers/customerTransmittalController.js`
- `backend/src/routes/customerTransmittalRoutes.js`

## Important

The package intentionally does NOT include the backend `.env` file or `node_modules`.
Create your own `backend/.env` from `backend/.env.example`.

## Expected behaviour

### Admin
- Sees all projects.
- Can create projects.
- Can manage users and project assignments.
- Sees all customer transmittals.

### Document Controller / Member / Viewer
- Sees only projects assigned through `project_members`.
- Cannot open an unassigned project by manually changing the project ID.
- Sees only transmittals belonging to assigned projects.
- Cannot create projects.

## Test

1. Restart backend after replacing the backend files.
2. Restart frontend with `npm run dev`.
3. Login as an ordinary user with no project assignments: Projects should be empty.
4. Assign exactly one project to that user from Admin -> Users -> Projects.
5. Refresh/login again: exactly one project should appear.
6. Open that project -> Transmittals. The page should render instead of showing `ProjectTransmittals is not defined`.
7. Login as admin: all projects should appear.
