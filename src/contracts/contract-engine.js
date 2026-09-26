/**
 * Finora Advanced Contract Lifecycle Management (CLM) Engine
 * Governed strictly by Chapters 019, 034, 052, 072, 099, 116, 177.
 */

const crypto = require('crypto');
const { ContractRiskAnalyzer } = require('./contract-risk-analyzer');

class ContractEngine {
  constructor({ documentStore = null }) {
    this.documentStore = documentStore;
    this.contracts = new Map(); // id -> Contract
    this.clauses = new Map(); // contract_id -> [Clauses]
    this.obligations = new Map(); // id -> Obligation
    this.amendments = [];
    this.snapshots = new Map(); // contract_id:version -> Snapshot
  }

  createContract({
    id,
    tenant_id,
    organization_id,
    contract_number,
    contract_type = 'sales', // 'sales' | 'purchase' | 'service' | 'partnership' | 'nda' | 'government'
    counterparty,
    title,
    description = '',
    start_date,
    end_date,
    currency = 'IRR',
    contract_amount = 0,
    payment_terms = 'milestone_based',
    owner_user = 'legal_lead'
  }) {
    if (!id || !tenant_id || !organization_id || !contract_number || !counterparty || !title) {
      throw new Error('Missing mandatory parameters for contract creation.');
    }

    const contract = {
      id,
      tenant_id,
      organization_id,
      contract_number,
      contract_type,
      party_id: counterparty.id,
      party_name: counterparty.name,
      party_national_id: counterparty.national_id,
      title: title.trim(),
      description,
      start_date,
      end_date,
      currency,
      contract_amount: Number(contract_amount) || 0,
      payment_terms,
      owner_user,
      version: 1,
      status: 'draft', // 'draft' | 'under_review' | 'approved' | 'signed' | 'active' | 'amended' | 'expired' | 'terminated'
      is_locked: false,
      signed_at: null,
      signed_by: null,
      risk_evaluation: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.contracts.set(id, contract);
    this.clauses.set(id, []);
    return contract;
  }

  addClause(contractId, { type, title, text, standard = true }) {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error(`Contract '${contractId}' not found.`);
    if (contract.is_locked) {
      throw new Error(`Cannot modify clauses of signed contract '${contractId}'. Use amendment.`);
    }

    const clause = {
      clause_id: `CLS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      contract_id: contractId,
      type, // 'liability' | 'penalty' | 'dispute_resolution' | 'price_adjustment' | 'scope'
      title,
      text,
      standard,
      created_at: new Date().toISOString()
    };

    this.clauses.get(contractId).push(clause);
    // Recalculate risk evaluation
    contract.risk_evaluation = ContractRiskAnalyzer.evaluateRisk(contract, this.clauses.get(contractId));
    return clause;
  }

  addObligation({
    id,
    contract_id,
    party_role = 'counterparty', // 'organization' | 'counterparty'
    type = 'delivery', // 'delivery' | 'payment' | 'reporting' | 'service' | 'guarantee'
    description,
    due_date,
    amount = 0,
    responsible_person = null
  }) {
    const contract = this.contracts.get(contract_id);
    if (!contract) throw new Error(`Contract '${contract_id}' not found.`);

    const obligation = {
      id: id || `OBL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      contract_id,
      tenant_id: contract.tenant_id,
      organization_id: contract.organization_id,
      party_role,
      type,
      description,
      due_date,
      amount: Number(amount) || 0,
      responsible_person,
      status: 'pending', // 'pending' | 'in_progress' | 'completed' | 'breached' | 'waived'
      completed_at: null,
      evidence_document_id: null,
      created_at: new Date().toISOString()
    };

    this.obligations.set(obligation.id, obligation);
    return obligation;
  }

  updateObligationStatus(obligationId, status, evidenceDocId = null) {
    const obl = this.obligations.get(obligationId);
    if (!obl) throw new Error(`Obligation '${obligationId}' not found.`);

    if (!['pending', 'in_progress', 'completed', 'breached', 'waived'].includes(status)) {
      throw new Error(`Invalid obligation status: ${status}`);
    }

    obl.status = status;
    if (status === 'completed') {
      obl.completed_at = new Date().toISOString();
      obl.evidence_document_id = evidenceDocId;
    }
    return obl;
  }

  approveContract(contractId, actor = 'legal_counsel') {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error(`Contract '${contractId}' not found.`);
    if (contract.status !== 'draft' && contract.status !== 'under_review') {
      throw new Error(`Contract '${contractId}' cannot be approved from state '${contract.status}'.`);
    }

    contract.status = 'approved';
    contract.approved_by = actor;
    contract.approved_at = new Date().toISOString();
    return contract;
  }

  signContract(contractId, { signerId, signatureHash = null }) {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error(`Contract '${contractId}' not found.`);
    if (contract.status !== 'approved') {
      throw new Error(`Contract '${contractId}' must be approved prior to signing.`);
    }

    // Freeze snapshot
    const contractClauses = this.clauses.get(contractId) || [];
    const snapshotPayload = JSON.stringify({
      contract_id: contract.id,
      version: contract.version,
      amount: contract.contract_amount,
      terms: contract.payment_terms,
      start_date: contract.start_date,
      end_date: contract.end_date,
      clauses: contractClauses
    });
    const snapshotDigest = crypto.createHash('sha256').update(snapshotPayload).digest('hex');

    contract.status = 'signed';
    contract.is_locked = true;
    contract.signed_at = new Date().toISOString();
    contract.signed_by = signerId;
    contract.snapshot_hash = snapshotDigest;

    this.snapshots.set(`${contract.id}:v${contract.version}`, {
      snapshot_hash: snapshotDigest,
      payload: JSON.parse(snapshotPayload),
      signed_at: contract.signed_at,
      signed_by: signerId
    });

    return {
      contract,
      snapshotDigest
    };
  }

  createAmendment(contractId, {
    amendment_type = 'scope_change', // 'amount_change' | 'time_extension' | 'scope_change'
    amount_change = 0,
    date_change = null,
    reason,
    actor = 'contract_manager'
  }) {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error(`Contract '${contractId}' not found.`);
    if (!contract.is_locked) {
      throw new Error('Amendments can only be issued for locked/signed contracts.');
    }
    if (!reason || reason.trim() === '') {
      throw new Error('Amendment reason is mandatory.');
    }

    const previousVersion = contract.version;
    const newVersion = previousVersion + 1;
    const previousAmount = contract.contract_amount;
    const newAmount = previousAmount + Number(amount_change);

    const amendment = {
      amendment_id: `AMD-${contract.contract_number}-v${newVersion}`,
      contract_id: contractId,
      amendment_number: newVersion - 1,
      amendment_type,
      previous_version: previousVersion,
      new_version: newVersion,
      previous_amount: previousAmount,
      new_amount: newAmount,
      amount_change: Number(amount_change),
      previous_end_date: contract.end_date,
      new_end_date: date_change || contract.end_date,
      reason,
      actor,
      created_at: new Date().toISOString()
    };

    // Update contract state immutably advancing version
    contract.version = newVersion;
    contract.contract_amount = newAmount;
    if (date_change) contract.end_date = date_change;
    contract.status = 'amended';
    contract.updated_at = new Date().toISOString();

    this.amendments.push(amendment);
    return {
      contract,
      amendment
    };
  }

  evaluateContractRisk(contractId) {
    const contract = this.contracts.get(contractId);
    if (!contract) throw new Error(`Contract '${contractId}' not found.`);
    const clauses = this.clauses.get(contractId) || [];
    const evaluation = ContractRiskAnalyzer.evaluateRisk(contract, clauses);
    contract.risk_evaluation = evaluation;
    return evaluation;
  }

  getDueObligations(daysWindow = 30) {
    const now = new Date();
    const threshold = new Date(now.getTime() + daysWindow * 24 * 60 * 60 * 1000);
    const thresholdStr = threshold.toISOString().split('T')[0];

    return Array.from(this.obligations.values()).filter(o => 
      o.status === 'pending' || o.status === 'in_progress'
    ).filter(o => o.due_date <= thresholdStr);
  }
}

module.exports = { ContractEngine };
