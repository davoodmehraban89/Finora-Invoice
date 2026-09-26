# FINORA KNOWN LIMITATIONS & EXTENSION REGISTER

## 1. External Third-Party Runtime Connectors (Offline Sandbox Mode)
- **Live Moadian Production Endpoint:** The core schema, validator, payload builder, and cryptographic signing abstraction are fully implemented and verified. In isolated development environments without external internet access, live HTTP dispatch is routed through the sandbox adapter.
- **SETAD Tender Portal:** Supported via standardized file export/import workflows and structured manual handoffs rather than live scraping or unofficial automation.

## 2. Release Scope Boundaries per Chapter 251
- **Vertical Industry Clouds (Chapters 181–230):** The extension specifications and schema hooks are designed and registered. Direct runtime connectors for 50 specialized industries are scheduled for Release 3 extensions per Chapter 251.
- **Autonomous Enterprise Agents (Chapters 151–180):** High-level autonomous governance and multi-agent coordination are architected. Version 1 strictly enforces Human Authority on all high-risk actions.
