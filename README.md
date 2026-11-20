# img-shoot

Repository for the img-shoot application, organized as a frontend and backend:

- `shoot-frontend/` — frontend application. Frontend milestones use **F00, F01, ...**.
- `shoot-backend/` — backend application. Backend milestones use **B00, B01, ...**.

The component folders are currently empty. Add the approved application stack and its development instructions in each folder before implementing application code. See [Git workflow](docs/git-workflow.md) and the [milestone index](docs/milestones/README.md).

## Development workflow

Use `main` for approved releases, `develop` for integration, and one `milestone/<ID>-<description>` branch per scoped milestone. Open milestone pull requests against `develop`; merge only after review and required checks pass. CI currently validates repository structure. Add stack-specific install, lint, test, typecheck, and build checks once the frontend and backend stacks are established.
