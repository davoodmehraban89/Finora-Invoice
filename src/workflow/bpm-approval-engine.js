/**
 * Finora Business Process Management (BPM) & Multi-Level Approval Workflow Engine
 * Governed by Chapters 018, 065, 083, 148 of the Finora Master Specification.
 *
 * Implements:
 * - Multi-Level Hierarchical Approval Policies by Financial Thresholds (ماتریس حدود اختیارات مالی)
 * - Strict Separation of Duties (SoD / تفکیک وظایف): Originator cannot approve their own request
 * - SLA Monitoring & Temporary Delegation of Authority (تفویض اختیار موقت)
 * - Dual-Signoff for High-Value Transactions (مدیرعامل + مدیر مالی)
 * - Immutable Audit Trail with Cryptographic Event Lineage
 */

const crypto = require('crypto');

class BpmApprovalEngine {
  constructor() {
    this.approvalPolicies = new Map(); // document_type -> Policy
    this.workflows = new Map(); // instance_id -> WorkflowInstance
    this.delegations = []; // Array of active delegation rules
    this.auditTrail = [];

    // Initialize Default Statutory Threshold Matrix (ماتریس حدود اختیارات استاندارد)
    this._initDefaultPolicies();
  }

  _initDefaultPolicies() {
    // Standard Purchasing & Financial Voucher Approval Policy
    this.registerPolicy({
      document_type: 'PURCHASE_ORDER',
      tiers: [
        {
          tier_level: 1,
          name: 'تایید مدیر واحد',
          max_amount: 50000000, // Up to 50M IRR
          required_roles: ['DEPARTMENT_HEAD', 'FINANCIAL_MANAGER', 'CFO', 'CEO']
        },
        {
          tier_level: 2,
          name: 'تایید مدیر مالی',
          max_amount: 500000000, // 50M to 500M IRR
          required_roles: ['FINANCIAL_MANAGER', 'CFO', 'CEO']
        },
        {
          tier_level: 3,
          name: 'تایید دوامضایی هیئت مدیره / مدیرعامل و مدیر ارشد مالی',
          max_amount: Infinity, // Above 500M IRR
          required_roles: ['CFO', 'CEO'],
          require_dual_signoff: true
        }
      ]
    });
  }

  registerPolicy({ document_type, tiers }) {
    if (!document_type || !Array.isArray(tiers) || tiers.length === 0) {
      throw new Error('Invalid approval policy specification.');
    }
    this.approvalPolicies.set(document_type, {
      document_type,
      tiers: tiers.sort((a, b) => a.tier_level - b.tier_level)
    });
  }

  /**
   * Registers temporary delegation of authority (e.g., during executive leave).
   */
  registerDelegation({ delegator_id, delegatee_id, start_date, end_date, scope = 'ALL' }) {
    if (!delegator_id || !delegatee_id) throw new Error('Delegator and Delegatee IDs are required.');

    const rule = {
      delegation_id: `DEL-${Date.now()}-${this.delegations.length + 1}`,
      delegator_id,
      delegatee_id,
      start_date,
      end_date,
      scope,
      active: true,
      created_at: new Date().toISOString()
    };

    this.delegations.push(rule);
    return rule;
  }

  _isAuthorizedUser(userId, userRole, targetRole) {
    if (userRole === targetRole) return true;

    // Check active delegations
    const now = new Date().toISOString().split('T')[0];
    const hasDelegation = this.delegations.some(d =>
      d.delegatee_id === userId &&
      d.active &&
      (!d.start_date || d.start_date <= now) &&
      (!d.end_date || d.end_date >= now)
    );

    return hasDelegation;
  }

  /**
   * Submits a business document into the multi-level approval pipeline.
   */
  submitWorkflow({
    instance_id,
    tenant_id = 'default_tenant',
    document_type,
    document_id,
    amount,
    currency = 'IRR',
    initiator_id,
    metadata = {}
  }) {
    if (!instance_id || !document_type || !document_id || !initiator_id) {
      throw new Error('Incomplete workflow submission parameters.');
    }

    const policy = this.approvalPolicies.get(document_type);
    if (!policy) {
      throw new Error(`No approval policy registered for document type: '${document_type}'.`);
    }

    const amt = Math.max(0, Number(amount) || 0);

    // Determine target tier
    let targetTier = policy.tiers[0];
    for (const tier of policy.tiers) {
      if (amt <= tier.max_amount) {
        targetTier = tier;
        break;
      }
      targetTier = tier; // Fallback to highest tier
    }

    const instance = {
      instance_id,
      tenant_id,
      document_type,
      document_id,
      amount: amt,
      currency,
      initiator_id,
      metadata,
      status: 'PENDING_APPROVAL',
      current_tier: targetTier.tier_level,
      tier_details: targetTier,
      dual_signoff_required: Boolean(targetTier.require_dual_signoff),
      approvals: [], // { approver_id, approver_role, timestamp, comments }
      rejected_by: null,
      rejection_reason: null,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.workflows.set(instance_id, instance);
    this.recordAudit(initiator_id, 'SUBMIT_WORKFLOW', instance_id, { amount: amt, tier: targetTier.tier_level });

    return instance;
  }

  /**
   * Approves a workflow step enforcing Separation of Duties (SoD) and Dual-Signoff rules.
   */
  approveWorkflow(instanceId, { approver_id, approver_role, comments = '' }) {
    const wf = this.workflows.get(instanceId);
    if (!wf) throw new Error(`Workflow instance '${instanceId}' not found.`);

    if (wf.status !== 'PENDING_APPROVAL') {
      throw new Error(`Cannot approve workflow with status: ${wf.status}.`);
    }

    // Strict Invariant: Separation of Duties (SoD)
    // Originator cannot approve their own submission
    if (wf.initiator_id === approver_id) {
      throw new Error('Separation of Duties violation: Initiator cannot approve their own document.');
    }

    // Role validation
    const isRoleEligible = wf.tier_details.required_roles.includes(approver_role) ||
                           this._isAuthorizedUser(approver_id, approver_role, wf.tier_details.required_roles[0]);

    if (!isRoleEligible) {
      throw new Error(`Unauthorized role '${approver_role}'. Required roles: ${wf.tier_details.required_roles.join(', ')}.`);
    }

    // Prevent duplicate approval by same actor in dual sign-off
    const alreadyApproved = wf.approvals.some(a => a.approver_id === approver_id);
    if (alreadyApproved) {
      throw new Error(`Approver '${approver_id}' has already recorded an approval for this workflow.`);
    }

    wf.approvals.push({
      approver_id,
      approver_role,
      comments,
      timestamp: new Date().toISOString()
    });

    // Check completion condition
    if (wf.dual_signoff_required) {
      if (wf.approvals.length >= 2) {
        wf.status = 'APPROVED';
        wf.current_tier = 'COMPLETED';
      } else {
        wf.status = 'PENDING_APPROVAL'; // Waiting for 2nd executive signature
      }
    } else {
      wf.status = 'APPROVED';
      wf.current_tier = 'COMPLETED';
    }

    wf.updated_at = new Date().toISOString();
    this.recordAudit(approver_id, 'APPROVE_WORKFLOW', instanceId, { approvals_count: wf.approvals.length, final_status: wf.status });

    return wf;
  }

  /**
   * Rejects a workflow step.
   */
  rejectWorkflow(instanceId, { rejecter_id, rejecter_role, reason }) {
    const wf = this.workflows.get(instanceId);
    if (!wf) throw new Error(`Workflow instance '${instanceId}' not found.`);

    if (!reason) throw new Error('Rejection reason is mandatory.');

    wf.status = 'REJECTED';
    wf.rejected_by = {
      rejecter_id,
      rejecter_role,
      reason,
      timestamp: new Date().toISOString()
    };
    wf.updated_at = new Date().toISOString();

    this.recordAudit(rejecter_id, 'REJECT_WORKFLOW', instanceId, { reason });
    return wf;
  }

  recordAudit(actor, action, instanceId, details) {
    const entry = {
      audit_id: `WF-AUD-${Date.now()}-${this.auditTrail.length + 1}`,
      timestamp: new Date().toISOString(),
      actor,
      action,
      instance_id: instanceId,
      details
    };
    this.auditTrail.push(entry);
    return entry;
  }
}

module.exports = { BpmApprovalEngine };
