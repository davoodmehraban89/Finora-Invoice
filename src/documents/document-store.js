/**
 * Finora Electronic Records, e-Signature & Document Store
 * Governed by Chapters 015, 032, 047, 238, 248.
 */

const crypto = require('crypto');

class DocumentStore {
  constructor() {
    this.documents = new Map(); // id -> Document
    this.signatures = [];
    this.auditTrail = [];
  }

  ingestDocument({
    id,
    tenant_id,
    organization_id,
    title,
    document_type, // 'invoice_pdf' | 'contract' | 'tax_submission' | 'evidence'
    content_raw,
    mime_type = 'application/pdf',
    uploaded_by = 'system'
  }) {
    if (!id || !tenant_id || !title || !content_raw) {
      throw new Error('Incomplete document ingestion parameters.');
    }

    const sha256Checksum = crypto.createHash('sha256').update(content_raw).digest('hex');

    const doc = Object.freeze({
      id,
      tenant_id,
      organization_id,
      title,
      document_type,
      mime_type,
      size_bytes: Buffer.byteLength(content_raw),
      sha256_checksum: sha256Checksum,
      version: 1,
      is_locked: false,
      legal_hold: false,
      uploaded_by,
      created_at: new Date().toISOString()
    });

    this.documents.set(id, doc);
    this.recordAudit(uploaded_by, 'INGEST_DOCUMENT', id, { checksum: sha256Checksum, title });
    return doc;
  }

  applyDigitalSignature(documentId, { signer_id, certificate_reference, private_key = 'DEMO_SIGN_KEY' }) {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error(`Document '${documentId}' not found.`);

    const signatureHash = crypto
      .createHmac('sha256', private_key)
      .update(`${doc.id}:${doc.sha256_checksum}:${signer_id}`)
      .digest('hex');

    const signature = Object.freeze({
      signature_id: `SIG-${Date.now()}-${this.signatures.length + 1}`,
      document_id: documentId,
      signer_id,
      certificate_reference,
      signature_hash: signatureHash,
      signed_at: new Date().toISOString()
    });

    this.signatures.push(signature);
    this.recordAudit(signer_id, 'APPLY_DIGITAL_SIGNATURE', documentId, { signature_id: signature.signature_id });
    return signature;
  }

  setLegalHold(documentId, isHeld, actor = 'compliance') {
    const doc = this.documents.get(documentId);
    if (!doc) throw new Error(`Document '${documentId}' not found.`);

    const updated = Object.freeze({
      ...doc,
      legal_hold: Boolean(isHeld)
    });

    this.documents.set(documentId, updated);
    this.recordAudit(actor, 'UPDATE_LEGAL_HOLD', documentId, { legal_hold: isHeld });
    return updated;
  }

  recordAudit(actor, action, entityId, details) {
    this.auditTrail.push({
      audit_id: `DOC-AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      entity_id: entityId,
      details
    });
  }
}

module.exports = { DocumentStore };
