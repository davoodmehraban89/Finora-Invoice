# FINORA TECHNICAL & EXTERNAL BLOCKERS REGISTER

| Blocker ID | Affected Domain / Chapter | Description | Technical Mitigation | Resolution Status |
|---|---|---|---|---|
| BLK-001 | Ch 017, Ch 031, Ch 046, Ch 232 | Production Taxpayer System (سامانه مؤدیان) Private Key / TSP Server Access | Implemented cryptographic signing abstraction layer (TaxSigningProvider) with local RSA PKCS#8 sandbox key and structured payload mock adapter conforming to official specification. | MITIGATED_SANDBOX |
| BLK-002 | Ch 018 | Government SETAD Tender Official API access | Implemented Adapter pattern with manual package export and audit-compliant manual handoff workflow. | MITIGATED_WORKFLOW |
| BLK-003 | Ch 181–230 | Industry Clouds 181–230 external third-party core banking and EHR interfaces | Designed as modular Extension Packs on top of Platform Core. Architectures and schemas specified; runtime external connectors marked out-of-scope for V1 per Chapter 251. | CONTROLLED_SCOPE |
| BLK-004 | Ch 250, Ch 258 | Live production cloud tenant billing credentials | Isolated within configurable secret references; mock/test harness used for local verification without leaking credentials or incurring charges. | MITIGATED_SECURITY |
