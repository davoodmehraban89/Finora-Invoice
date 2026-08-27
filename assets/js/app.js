(function () {
  'use strict';
  const demo = new URLSearchParams(location.search).get('demo') === '1';
  const demoData = {
    customers: [{ id: 'demo-customer', name: 'شرکت نمونه پارس', nationalId: '۱۰۱۰۱۲۳۴۵۶۷', phone: '۰۲۱۸۸۷۷۶۶۵۵' }],
    products: [{ id: 'demo-product', name: 'خدمات مشاوره مالی', code: 'SRV-001', unit: 'ساعت', sellPrice: 2500000, taxPercent: 10 }]
  };

  function initFirebase() {
    if (demo || !window.firebase || !window.FINORA_FIREBASE_CONFIG) return null;
    if (!firebase.apps.length) firebase.initializeApp(window.FINORA_FIREBASE_CONFIG);
    return { auth: firebase.auth(), db: firebase.firestore() };
  }

  const sdk = initFirebase();
  const state = { user: demo ? { uid: 'demo-user', email: 'demo@finora.local' } : null };
  const localKey = name => `finora:${state.user.uid}:${name}`;
  const localRead = name => JSON.parse(localStorage.getItem(localKey(name)) || '[]');
  const localWrite = (name, value) => localStorage.setItem(localKey(name), JSON.stringify(value));
  const collection = name => sdk.db.collection('users').doc(state.user.uid).collection(name);

  async function requireAuth(callback) {
    if (demo) return callback(state.user);
    if (!sdk) return location.replace('index.html?error=config');
    sdk.auth.onAuthStateChanged(user => {
      if (!user) location.replace('index.html');
      else { state.user = user; callback(user); }
    });
  }

  async function list(name, orderField = 'createdAt') {
    if (demo) {
      const stored = localRead(name);
      if (stored.length) return stored;
      return demoData[name] || [];
    }
    let query = collection(name);
    if (orderField) query = query.orderBy(orderField, 'desc');
    const snap = await query.get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async function get(name, id) {
    if (demo) return (await list(name, null)).find(x => x.id === id) || null;
    const doc = await collection(name).doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  }

  async function saveInvoice(invoice) {
    if (demo) {
      const invoices = localRead('invoices');
      invoice.id = invoice.id || `demo-${Date.now()}`;
      invoice.invoiceNumber = invoice.invoiceNumber || `FI-${String(invoices.length + 1).padStart(6, '0')}`;
      invoice.createdAt = invoice.createdAt || new Date().toISOString();
      const index = invoices.findIndex(x => x.id === invoice.id);
      if (index >= 0) invoices[index] = invoice; else invoices.unshift(invoice);
      localWrite('invoices', invoices);
      return invoice;
    }
    const userRef = sdk.db.collection('users').doc(state.user.uid);
    return sdk.db.runTransaction(async tx => {
      const counterRef = userRef.collection('counters').doc('invoices');
      const counter = await tx.get(counterRef);
      const next = (counter.exists ? Number(counter.data().value) : 0) + 1;
      const ref = invoice.id ? userRef.collection('invoices').doc(invoice.id) : userRef.collection('invoices').doc();
      const data = { ...invoice, invoiceNumber: invoice.invoiceNumber || `FI-${String(next).padStart(6, '0')}`, updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
      if (!invoice.id) data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      tx.set(ref, data, { merge: true });
      if (!invoice.id) tx.set(counterRef, { value: next }, { merge: true });
      return { id: ref.id, ...data };
    });
  }

  async function signOut() {
    if (demo) return location.replace('index.html');
    await sdk.auth.signOut(); location.replace('index.html');
  }

  function money(value) { return `${new Intl.NumberFormat('fa-IR').format(Math.round(Number(value) || 0))} ریال`; }
  function escape(value) { const el = document.createElement('div'); el.textContent = value == null ? '' : String(value); return el.innerHTML; }
  function today() { return new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()).replaceAll('/', '-'); }

  window.Finora = { demo, sdk, state, requireAuth, list, get, saveInvoice, signOut, money, escape, today };
})();
