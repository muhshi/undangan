# Prompt: Deploy Undangan Muhshi Front-End on Ubuntu with Docker

You are an experienced DevOps engineer helping me containerise and deploy the **Undangan Muhshi** front-end onto my Ubuntu 22.04 server. The repository has already been cloned to `/apps/muhshi/undangan`.

## Repository facts (for your reference)

- Build tool: `esbuild`
- Package manager: `npm` (but compatible with `pnpm`/`yarn`)
- Relevant scripts:
  - `npm install`
  - `npm run build` → outputs bundled assets to `dist/`
  - `npm run build:public` → creates deployable `public/` folder (copies `assets`, `css`, `dist`, `index.html`, `dashboard.html`)
- Static front-end; consumes external Laravel API via attributes on `<body>` (`data-url`, `data-event-slug`, etc.)
- Desired runtime: serve the generated `public/` directory with a lightweight HTTP server (e.g., Nginx, Caddy, or `node:alpine` + `http-server`).
- Final domain: `https://undangan.muhshi.my.id`

## Tasks for the assistant

1. Produce a Dockerfile (multi-stage if useful) that:
   - Installs dependencies and runs the build in a builder stage.
   - Copies the `public/` artefacts into a minimal runtime image.
   - Serves the site on port `8080` inside the container.
2. Provide a `docker-compose.yml` snippet (single service) exposing container port `8080` → host `8080`, with the project directory mounted read-only if needed.
3. Document commands to build and run the container on the Ubuntu server.
4. Explain how to update the site when new commits land (e.g., pull + rebuild + redeploy sequence).
5. Mention any prerequisites (Docker Engine, Docker Compose plugin) and how to install them if missing.
6. Include notes about configuring reverse proxy / TLS (I use Nginx and have a certificate via Certbot already).

Please respond with structured steps and include command snippets in fenced code blocks. If you recommend configuration files, show their full contents.
