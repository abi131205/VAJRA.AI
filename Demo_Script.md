# VAJRA.AI V4 - Datathon Live Demonstration Script
*Quick Reference Guide for the Presenter*

---

## Preparation
1. Open the VAJRA.AI deployed portal url in Chrome.
2. Toggle on the **Datathon Mock Mode** checkbox (to load cached OCR outputs instantly during the live talk).
3. Ensure the browser developer console is closed.

---

## Step 1: Secure Badge Authorization (Login Screen)
* **Action**:
  * Point to the official branding of the **SCRB Karnataka Portal**.
  * Input email: `inspector.rajesh@karnataka.gov.in`
  * Input password: `VajraPass123`
  * Click **Authorize Station Entry**.
* **Key Talking Point**:
  * *"Instead of another AI chatbot window, the officer logs in to a dedicated situation workspace aligned directly with their official active directory clearance."*

---

## Step 2: The Situation Room & Auto-Timeline (Middle Panel)
* **Action**:
  * Select case **FIR_12_2026 : Electronic City Commercial Robbery** from the left-hand case catalog.
  * In the middle panel, locate the **Ingest Case Document** dashed box.
  * Click **Select File**, choose a witness statement file (or any text file).
  * Watch the loader update as **Zia OCR** processes characters and routes the output to the **Timeline Agent**.
  * View the populated chronological timeline (Alarm Triggers, CCTV pickups, SI confirmation reports).
* **Key Talking Points**:
  * *"Uploading a physical witness statement triggers Zoho Zia OCR text extraction, passing raw text to our serverless Timeline Agent to dynamically reconstruct chronological timelines. Note that we do not ask the AI questions; the situation events simply appear on screen, drastically reducing the investigator's cognitive load."*

---

## Step 3: Legal reference Mapping & Explainability (Right Panel)
* **Action**:
  * Point out the **BNS Penalty Recommendations** card list that populated under Case Decision Support.
  * Click on **Section 303 (Theft in Dwelling House)** to open the **Explainability Data Card**.
  * Hover/review the rationale and **Red Admissibility Warning** box.
* **Key Talking Points**:
  * *"Every AI recommendation provides an Explainability Card mapping timeline facts to BNS codes with strict legal rationale. Notice the Red Admissibility warning – the system does not make decisions; it advises the human on legal constraints (e.g. verifying time sync logs for time-based entries). The human remains the final authority."*

---

## Step 4: Cryptographic Ledger Auditing
* **Action**:
  * In the **AI Team Audit Ledger** log feed, click on the green **VERIFIED** link next to an entry.
  * Point to the overlay displaying the SHA-256 validation code.
* **Key Talking Points**:
  * *"Every action—from OCR extractions to legal mappings—is hashed using SHA-256 and locked in the Catalyst Data Store audit ledger. Clicking verify runs a validation check live on screen. Judges and auditors can verify that no AI hallucination or human database tampering has occurred."*

---

## Step 5: Entity Resolution Graph
* **Action**:
  * Toggle the middle panel tab from **Timeline** to **Connections**.
  * View the interactive node graph mapping Rajesh (IO) -> Case -> CCTV Video -> Suspect (alias Raj) -> Call records.
* **Key Talking Points**:
  * *"Toggling Connections displays resolved entity relationships. By checking NoSQL session caches, we map suspect records, phone CDRs, and location nodes to reveal hidden networks in under a second."*

---

## Step 6: SmartBrowz PDF Brief Dispatch
* **Action**:
  * Click **SmartBrowz Case PDF Brief** at the bottom right.
  * The browser automatically downloads `brief_FIR_12_2026.pdf`.
  * Open the PDF to showcase the neat, court-ready report layout.
* **Key Talking Points**:
  * *"With the timeline compiled and BNS codes mapped, a single click triggers Zoho Catalyst SmartBrowz to compile and download a formatted PDF prosecution brief, transforming days of paperwork into seconds of work."*
