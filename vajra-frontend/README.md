# VAJRA.AI — Frontend Web Application
*High-Fidelity Situation Room and AI Copilot Portal*

This directory houses the client-side React application for VAJRA.AI. Built on top of Vite and TailwindCSS, it provides a state-of-the-art visual experience with deep dark themes, glowing borders, custom charts, and smooth animations.

---

## 🎨 Premium Editorial Styling System

The application uses a customized design language avoiding generic corporate dashboard templates:
*   **Theme Aesthetic**: Sleek Dark Editorial Mode with off-black charcoal backgrounds (`#0a0808` to `#161212`), glowing orange/amber border cues, and warm ivory/charcoal accent typography.
*   **Typography**: Playfair Display for headings and outfit/inter for system reading.
*   **D3 Engine Nodes**: Clean suspect interaction maps utilizing high-contrast vector connections.

---

## 🧩 Key User Interface Views

1.  **Situation Room Control Panel**: Shows all live cases fetched from the Catalyst datastore, allows filtering by FIR/MO numbers, and provides case timeline visualizers.
2.  **AI Co-Pilot Chat Console**: Streamed legal and investigative responses (SSE) from the backend LLM orchestrator.
3.  **D3 CDR Entity Network Graph**: An interactive graph visualization mapping suspect phone/email nodes, call-detail-records (CDRs), and cross-referenced cases.
4.  **Audit Ledger Timeline**: A scrollable history of all modifications and ingress activities signed cryptographically to prevent database tampering.
5.  **Evidence Ingress Portal**: A dropzone interface enabling PDF uploads, launching active OCR extractions, and rendering document previews.

---

## ⚙️ Zustand Global Store Management

All state flows through `src/store.js` using Zustand:
*   **Auth State**: Tracks JWT tokens, current logged-in officer profile metadata, and permissions.
*   **Case State**: Manages the currently selected case, timeline entries, evidence attachments, similarity matches, and D3 network nodes.
*   **Streaming Chat**: Handles sending prompts to the server and appending real-time text streams.
*   **Datathon Mock Mode**: A checkbox to instantly toggle between local mock JSON buffers and live API server calls.

---

## 🚀 Development & Build Workflow

### Local Development
```bash
npm install
npm run dev
```
Runs the dev server on `http://localhost:5173`. Make sure to start the backend gateway mock server on port `8080`.

### Production Build
To bundle the frontend for deployment to Zoho Catalyst Web Client hosting:
```bash
npm run build
```
The output is generated inside the `dist/` directory.

---

## 📦 Deployment to Zoho Catalyst hosting
To deploy this frontend to the cloud:
1. Compile the build: `npm run build`
2. Compress all files inside `dist/` directly into a zip file named `frontend.zip` (do not zip the parent folder itself).
3. Upload `frontend.zip` to the **Web Client Hosting** section in the Zoho Catalyst console.
