import re
import os
import json

BASE_DIR = "/working_dir/c_fe7b7e9e75253b03"

print("--- 1. Remediating DEFECT 01: XSS in HTML files ---")
html_files = [
    "customers.html", "invoices.html", "procurement.html", "treasury.html",
    "dashboard.html", "payroll.html", "contracts.html", "products.html",
    "new-invoice.html", "settings.html"
]

escape_script_tag = """
  <script>
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    if (typeof window !== 'undefined') window.escapeHtml = escapeHtml;
  </script>
"""

for hf in html_files:
    path = os.path.join(BASE_DIR, hf)
    if not os.path.exists(path):
        continue
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()

    # Ensure escapeHtml script is in <head>
    if "function escapeHtml" not in content:
        content = content.replace("</head>", f"{escape_script_tag}\n</head>")

    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print(f"Added escapeHtml helper to {hf}")

# Also update finora-core-client.js
client_js_path = os.path.join(BASE_DIR, "assets/js/finora-core-client.js")
with open(client_js_path, "r", encoding="utf-8") as f:
    client_code = f.read()

if "function escapeHtml" not in client_code:
    client_code = """function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
if (typeof window !== 'undefined') {
  window.escapeHtml = escapeHtml;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports.escapeHtml = escapeHtml;
}
""" + "\n" + client_code
    with open(client_js_path, "w", encoding="utf-8") as f:
        f.write(client_code)
    print("Added escapeHtml to assets/js/finora-core-client.js")

# In customers.html: ensure variables are escaped
customers_path = os.path.join(BASE_DIR, "customers.html")
with open(customers_path, "r", encoding="utf-8") as f:
    cust_content = f.read()

cust_content = cust_content.replace("<strong>${c.name}</strong>", "<strong>${escapeHtml(c.name)}</strong>")
cust_content = cust_content.replace("${c.national_id || '-'}", "${escapeHtml(c.national_id || '-')}")
cust_content = cust_content.replace("${c.economic_code || '-'}", "${escapeHtml(c.economic_code || '-')}")
cust_content = cust_content.replace("${c.phone || '-'}", "${escapeHtml(c.phone || '-')}")
cust_content = cust_content.replace("${c.address || '-'}", "${escapeHtml(c.address || '-')}")
with open(customers_path, "w", encoding="utf-8") as f:
    f.write(cust_content)

# In invoices.html: ensure variables are escaped
invoices_path = os.path.join(BASE_DIR, "invoices.html")
with open(invoices_path, "r", encoding="utf-8") as f:
    inv_content = f.read()
inv_content = inv_content.replace("<strong>${inv.invoice_number}</strong>", "<strong>${escapeHtml(inv.invoice_number)}</strong>")
inv_content = inv_content.replace("<td>${inv.customer_name}</td>", "<td>${escapeHtml(inv.customer_name)}</td>")
inv_content = inv_content.replace("<td>${inv.currency}</td>", "<td>${escapeHtml(inv.currency)}</td>")
with open(invoices_path, "w", encoding="utf-8") as f:
    f.write(inv_content)

# In procurement.html: ensure variables are escaped
procurement_path = os.path.join(BASE_DIR, "procurement.html")
with open(procurement_path, "r", encoding="utf-8") as f:
    po_content = f.read()
po_content = po_content.replace("<strong>${po.po_number}</strong>", "<strong>${escapeHtml(po.po_number)}</strong>")
po_content = po_content.replace("<td>${po.supplier_name}</td>", "<td>${escapeHtml(po.supplier_name)}</td>")
with open(procurement_path, "w", encoding="utf-8") as f:
    f.write(po_content)

# In treasury.html: ensure variables are escaped
treasury_path = os.path.join(BASE_DIR, "treasury.html")
with open(treasury_path, "r", encoding="utf-8") as f:
    tr_content = f.read()
tr_content = tr_content.replace("<code>${c.sayad_id}</code>", "<code>${escapeHtml(c.sayad_id)}</code>")
tr_content = tr_content.replace("<td>${c.bank_name}", "<td>${escapeHtml(c.bank_name)}")
tr_content = tr_content.replace(" - ${c.branch_name}</td>", " - ${escapeHtml(c.branch_name)}</td>")
tr_content = tr_content.replace("<td>${c.drawer_name}</td>", "<td>${escapeHtml(c.drawer_name)}</td>")
tr_content = tr_content.replace("<td>${c.cheque_number}</td>", "<td>${escapeHtml(c.cheque_number)}</td>")
tr_content = tr_content.replace("<td>${c.payee_name}</td>", "<td>${escapeHtml(c.payee_name)}</td>")
with open(treasury_path, "w", encoding="utf-8") as f:
    f.write(tr_content)

print("DEFECT 01 HTML escaping completed.")

