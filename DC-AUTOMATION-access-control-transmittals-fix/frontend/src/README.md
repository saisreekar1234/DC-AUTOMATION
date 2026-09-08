# Document Control Automation — Professional UI V3

This package is a visual rebuild based on the latest dashboard App.jsx.

## What changed
- Removed the Light/Dark theme state, localStorage theme keys and theme toggle from `App.jsx`.
- Removed the Light/Dark button from the top bar/profile area.
- Uses one consistent professional enterprise light workspace instead of a theme system that was not applying reliably.
- Preserves the latest live dashboard data and dashboard layout.
- Stronger table/grid borders and section dividers for document-control readability.
- More restrained engineering-enterprise palette: warm neutral workspace, deep navy navigation, controlled blue actions.
- Cleaner account identity block and sign-out control.
- Global overrides cover dashboard, projects, documents, transmittals, approvals, settings, forms, tables, modals and status badges.

## Install
Copy these files into the frontend `src` folder:
- `App.jsx`
- `index.css`
- `dashboard.css`
- `professional-ui.css`

The new `App.jsx` imports `professional-ui.css`.

Then restart Vite and hard-refresh the browser.
