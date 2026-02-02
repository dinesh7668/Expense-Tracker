const LS_KEY = 'et_transactions'
const THEME_KEY = 'et_theme'

// UI elements jitne bhi hai sare le liye yahi pe
const txForm = document.getElementById('txForm')
const titleEl = document.getElementById('title')
const amountEl = document.getElementById('amount')
const categoryEl = document.getElementById('category')
const dateEl = document.getElementById('date')
const txList = document.getElementById('txList')
const balanceEl = document.getElementById('balance')
const incomeEl = document.getElementById('income')
const expensesEl = document.getElementById('expenses')
const msgEl = document.getElementById('msg')
const filterCategory = document.getElementById('filterCategory')
const themeToggle = document.getElementById('themeToggle')

let transactions = []

// Helpers
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8) }
function save() { localStorage.setItem(LS_KEY, JSON.stringify(transactions)) }
function load() { try { const s = localStorage.getItem(LS_KEY); transactions = s ? JSON.parse(s) : [] } catch (e) { transactions = [] } }

// Render
function renderTransactions(filter = 'all') {
  txList.innerHTML = ''
  const list = transactions.slice().reverse()
  list.forEach(tx => {
    if (filter !== 'all' && tx.category !== filter) return
    const li = document.createElement('li')
    li.className = 'tx-item ' + (tx.amount > 0 ? 'income' : 'expense')
    if (tx.pending) li.classList.add('pending-delete')
    li.setAttribute('data-id', tx.id)

    const meta = document.createElement('div'); meta.className = 'tx-meta'
    const title = document.createElement('div'); title.className = 'tx-title'; title.textContent = tx.title
    const sub = document.createElement('div'); sub.className = 'tx-sub'; sub.textContent = `${tx.category} • ${tx.date || ''}`
    meta.appendChild(title); meta.appendChild(sub)

    const right = document.createElement('div'); right.className = 'tx-actions'
    const amt = document.createElement('div'); amt.className = 'amount'; amt.textContent = formatCurrency(tx.amount)

    if (tx.pending) {
      const undo = document.createElement('button'); undo.className = 'undo-btn btn'; undo.textContent = 'Undo'
      undo.addEventListener('click', () => undoPending(tx.id))
      const perm = document.createElement('button'); perm.className = 'perm-delete-btn btn'; perm.textContent = 'Delete'
      perm.addEventListener('click', () => permanentDelete(tx.id))
      right.appendChild(amt); right.appendChild(undo); right.appendChild(perm)
    } else {
      const del = document.createElement('button'); del.className = 'delete-btn'; del.title = 'Delete'; del.textContent = '✕'
      del.addEventListener('click', () => markPending(tx.id))
      right.appendChild(amt); right.appendChild(del)
    }
    li.appendChild(meta); li.appendChild(right)
    txList.appendChild(li)
  })
  updateTotalsAnimated()
}

function formatCurrency(n) {
  const neg = n < 0
  const abs = Math.abs(n)
  return (neg ? '- ' : '') + '₹' + abs.toFixed(2)
}

// Add / Remove
function addTransaction(e) {
  e.preventDefault()
  msgEl.textContent = ''
  const title = titleEl.value.trim()
  let amount = parseFloat(amountEl.value)
  const category = categoryEl.value
  const date = dateEl.value

  if (!title) { msgEl.textContent = 'Please enter a title'; return }
  if (isNaN(amount) || amount === 0) { msgEl.textContent = 'Please enter a non-zero amount'; return }

  // Normalize sign: Income should be positive, all other categories treated as expenses (negative)
  amount = Math.abs(amount) * (category === 'Income' ? 1 : -1)

  const tx = { id: uid(), title, amount, category, date }
  transactions.push(tx)
  save()
  // optimistic render
  renderTransactions(filterCategory.value)
  txForm.reset()
  // visual feedback: brief pulse on add button
  flashAdd()
}

// Mark a transaction as pending deletion (undoable)
function markPending(id) {
  const tx = transactions.find(t => t.id === id)
  if (!tx) return
  tx.pending = true
  save()
  renderTransactions(filterCategory.value)
}

function undoPending(id) {
  const tx = transactions.find(t => t.id === id)
  if (!tx) return
  delete tx.pending
  save()
  renderTransactions(filterCategory.value)
}

function permanentDelete(id) {
  transactions = transactions.filter(t => t.id !== id)
  save()
  renderTransactions(filterCategory.value)
}

// Totals
function calculateTotals() {
  let income = 0, expenses = 0
  transactions.forEach(t => { if (t.pending) return; if (t.amount > 0) income += t.amount; else expenses += t.amount })
  const balance = income + expenses
  return { income, expenses: Math.abs(expenses), balance }
}

function animateCounter(el, from, to, duration = 500) {
  const start = performance.now()
  function frame(now) {
    const t = Math.min(1, (now - start) / duration)
    const val = from + (to - from) * easeOutCubic(t)
    el.textContent = '₹' + val.toFixed(2)
    if (t < 1) requestAnimationFrame(frame)
  }
  requestAnimationFrame(frame)
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3) }

let lastTotals = { income: 0, expenses: 0, balance: 0 }
function updateTotalsAnimated() {
  const t = calculateTotals()
  animateCounter(incomeEl, lastTotals.income, t.income)
  animateCounter(expensesEl, lastTotals.expenses, t.expenses)
  animateCounter(balanceEl, lastTotals.balance, t.balance)
  lastTotals = t
}

// UI helpers
function flashAdd() {
  const btn = document.getElementById('addBtn')
  btn.classList.add('ripple')
  const span = document.createElement('span')
  const rect = btn.getBoundingClientRect();
  span.style.left = (rect.width / 2) + 'px'; span.style.top = (rect.height / 2) + 'px'
  btn.appendChild(span)
  setTimeout(() => { btn.removeChild(span); btn.classList.remove('ripple') }, 700)
}

// Theme handling
function applyTheme(theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
    document.body.classList.add('dark')
    themeToggle.textContent = '☀️'
  } else {
    document.documentElement.classList.remove('dark')
    document.body.classList.remove('dark')
    themeToggle.textContent = '🌙'
  }
  localStorage.setItem(THEME_KEY, theme)
}

// Filter
filterCategory.addEventListener('change', () => renderTransactions(filterCategory.value))

// Init
function init() {
  load()
  const savedTheme = localStorage.getItem(THEME_KEY) || 'light'
  applyTheme(savedTheme)
  renderTransactions()
  txForm.addEventListener('submit', addTransaction)
  themeToggle.addEventListener('click', () => applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark'))
  // Add small UX: click ripple for all primary buttons
  document.addEventListener('click', (e) => {
    const t = e.target.closest('.btn')
    if (!t) return
    t.classList.add('ripple')
    setTimeout(() => t.classList.remove('ripple'), 700)
  })
  // No global undo toast — inline undo/delete per transaction
}

// Start
init()

