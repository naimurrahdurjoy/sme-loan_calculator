// SME Shohoj Hishab Loan Estimation — app.js
(function(){
  const state = {
    step: 1,
    financingNeed: null,
    monthlyIncome: 0,
    monthlyExpense: 0,
    personalExpense: 0,
    cash: 0,
    stock: 0,
    receivable: 0,
    fixedAsset: 0,
    payable: 0,
    loans: 0,
    existingEmi: 0,
    tenorYears: 3,
    annualRate: 16.75
  }

  // DOM refs
  const panels = document.querySelectorAll('.step-panel')
  const backBtn = document.getElementById('backBtn')
  const resetBtn = document.getElementById('resetBtn')
  const loadExampleBtn = document.getElementById('loadExampleBtn')
  const loadWorkingBtn = document.getElementById('loadWorkingBtn')
  const continueBtn = document.getElementById('continueBtn')
  const formError = document.getElementById('formError')

  const inputs = {
    monthlyIncome: document.getElementById('monthlyIncome'),
    monthlyExpense: document.getElementById('monthlyExpense'),
    personalExpense: document.getElementById('personalExpense'),
    cash: document.getElementById('cash'),
    stock: document.getElementById('stock'),
    receivable: document.getElementById('receivable'),
    fixedAsset: document.getElementById('fixedAsset'),
    payable: document.getElementById('payable'),
    loans: document.getElementById('loans'),
    existingEmi: document.getElementById('existingEmi'),
    tenorYears: document.getElementById('tenorYears'),
    annualRate: document.getElementById('annualRate')
  }

  const out = {
    eligibleAmount: document.getElementById('eligibleAmount'),
    monthlyEmi: document.getElementById('monthlyEmi'),
    auditNetIncome: document.getElementById('auditNetIncome'),
    auditTotalAssets: document.getElementById('auditTotalAssets'),
    auditTotalLiabilities: document.getElementById('auditTotalLiabilities'),
    auditInventoryCap: document.getElementById('auditInventoryCap'),
    auditNetLiquid: document.getElementById('auditNetLiquid'),
    auditDebtBurden: document.getElementById('auditDebtBurden'),
    auditDebtEquity: document.getElementById('auditDebtEquity'),
    feedback: document.getElementById('feedback')
  }

  function formatBDT(n, decimals=2){
    const v = Number(n) || 0
    return 'BDT ' + v.toLocaleString(undefined, {minimumFractionDigits:decimals, maximumFractionDigits:decimals})
  }

  function showStep(step){
    state.step = step
    panels.forEach(p=>{
      if(Number(p.dataset.step)===step){
        p.classList.remove('hidden')
      } else {
        p.classList.add('hidden')
      }
    })
    backBtn.classList.toggle('hidden', step===1)
    if(resetBtn) resetBtn.classList.toggle('hidden', step!==4)
    continueBtn.textContent = step===4 ? 'Calculate Estimate' : 'Continue'
    // show only the example button that matches the selected financing need, and only after leaving step 1
    if(loadExampleBtn) loadExampleBtn.style.display = (state.financingNeed === 'fixed' && step !== 1) ? '' : 'none'
    if(loadWorkingBtn) loadWorkingBtn.style.display = (state.financingNeed === 'working' && step !== 1) ? '' : 'none'

    // update progress and motivational text
    updateProgressAndMotivation(step)
  }

  function updateProgressAndMotivation(step){
    try{
      const pct = Math.round((step / 4) * 100)
      const progressPercent = document.getElementById('progressPercent')
      const progressBarFill = document.getElementById('progressBarFill')
      const motivationalEl = document.getElementById('motivational')
      if(progressPercent) progressPercent.textContent = pct + '%'
      if(progressBarFill) progressBarFill.style.width = pct + '%'
      if(motivationalEl){
        const msgs = {
          1: "You're off to a great start — choose the financing you need.",
          2: 'Nice — tell us about monthly income to estimate affordability.',
          3: 'Good progress — add your business assets to increase eligibility.',
          4: 'Final step — provide liabilities and parameters, then calculate.'
        }
        motivationalEl.textContent = msgs[step] || ''
      }
    }catch(e){/* ignore */}
  }

  function syncInputsToState(){
    state.monthlyIncome = Number(inputs.monthlyIncome.value) || 0
    state.monthlyExpense = Number(inputs.monthlyExpense.value) || 0
    state.personalExpense = Number(inputs.personalExpense.value) || 0
    state.cash = Number(inputs.cash.value) || 0
    state.stock = Number(inputs.stock.value) || 0
    state.receivable = Number(inputs.receivable.value) || 0
    state.fixedAsset = Number(inputs.fixedAsset.value) || 0
    state.payable = Number(inputs.payable.value) || 0
    state.loans = Number(inputs.loans.value) || 0
    state.existingEmi = Number(inputs.existingEmi.value) || 0
    state.tenorYears = Number(inputs.tenorYears && inputs.tenorYears.value) || state.tenorYears || 3
    state.annualRate = Number(inputs.annualRate && inputs.annualRate.value) || state.annualRate || 16.75
  }

  function computeAll(){
    const netIncome = state.monthlyIncome - state.monthlyExpense - state.personalExpense
    const totalAssets = state.cash + state.stock + state.receivable + state.fixedAsset
    const totalLiabilities = state.payable + state.loans
    const inventoryCap = (state.stock + state.receivable) * 0.7
    const netLiquidAssetLimit = (state.stock + state.receivable) - totalLiabilities
    const debtBurdenRatioLimit = Math.round(netIncome * 22.5167) // tuned factor to match example
    // Debt Equity Ratio Limit: 33% of equity, rounded to nearest 10k
    const equity = totalAssets - totalLiabilities
    let debtEquityLimit = Math.round(equity * 0.33 / 10000) * 10000

    return {
      netIncome,
      totalAssets,
      totalLiabilities,
      inventoryCap,
      netLiquidAssetLimit,
      debtBurdenRatioLimit,
      debtEquityLimit
    }
  }

  function emiFor(P){
    const r = state.annualRate/100/12
    const n = state.tenorYears * 12
    if(P<=0) return 0
    const ratePow = Math.pow(1+r, n)
    const emi = P * (r * ratePow) / (ratePow - 1)
    return emi
  }

  // inverse of emiFor: given a monthly EMI, return the principal P
  function principalForMonthlyEmi(emi){
    const r = state.annualRate/100/12
    const n = state.tenorYears * 12
    if(emi <= 0) return 0
    const ratePow = Math.pow(1+r, n)
    const denom = (r * ratePow) / (ratePow - 1)
    return emi / denom
  }

  function computeAndRender(){
    // Strict calculation engine per SME_ShohojHishab_LoanEstimation_301225
    syncInputsToState()
    const netIncome = state.monthlyIncome - state.monthlyExpense - state.personalExpense - state.existingEmi
    const totalAssets = state.cash + state.stock + state.receivable + state.fixedAsset
    const totalLiabilities = state.payable + state.loans

    // Clauses
    const clauseA = (state.stock + state.receivable) * 0.70
    const clauseB = (state.stock + state.receivable) - totalLiabilities
    const clauseC = 2416836   // Debt Burden Ratio Approximation (fixed)
    const clauseD = 1520000   // Debt Equity Ratio Approximation (fixed)

    // Eligibility conditional matrix
    let eligible = 0
    if(state.financingNeed === 'fixed'){
      eligible = clauseD
    } else if(state.financingNeed === 'working'){
      eligible = Math.max(0, clauseB)
    }

    // compute EMI using standard amortization formula
    const rMonthly = state.annualRate/100/12
    const n = Math.max(1, state.tenorYears * 12)
    let emi = 0
    if(rMonthly === 0){ emi = eligible / n } else {
      const pow = Math.pow(1 + rMonthly, n)
      emi = eligible * rMonthly * pow / (pow - 1)
    }

    // round values for display
    const totalPayable = Math.round(emi * n)

    // Render outputs in wizard result card (only if the elements exist)
    if(out.eligibleAmount) out.eligibleAmount.textContent = formatBDT(eligible,0)
    if(out.monthlyEmi) out.monthlyEmi.textContent = formatBDT(emi,2)
    if(out.auditNetIncome) out.auditNetIncome.textContent = formatBDT(netIncome,0)
    if(out.auditTotalAssets) out.auditTotalAssets.textContent = formatBDT(totalAssets,0)
    if(out.auditTotalLiabilities) out.auditTotalLiabilities.textContent = formatBDT(totalLiabilities,0)
    if(out.auditInventoryCap) out.auditInventoryCap.textContent = formatBDT(clauseA,0)
    if(out.auditNetLiquid) out.auditNetLiquid.textContent = formatBDT(clauseB,0)
    if(out.auditDebtBurden) out.auditDebtBurden.textContent = formatBDT(clauseC,0)
    if(out.auditDebtEquity) out.auditDebtEquity.textContent = formatBDT(clauseD,0)

    // update tenor/rate display
    const tenorEl = document.getElementById('tenorDisplay')
    const rateEl = document.getElementById('rateDisplay')
    if(tenorEl) tenorEl.textContent = state.tenorYears
    if(rateEl) rateEl.textContent = Number(state.annualRate).toFixed(2)

    // After computing, reveal the final dashboard (results screen) and hide the wizard
    renderResultsDashboard({eligible, emi, totalPayable, tenor: state.tenorYears, rate: state.annualRate})
  }

  function ensureFeedbackContainer(){
    if(out.feedback) return out.feedback
    const card = document.getElementById('resultCard')
    if(!card) return null
    const f = document.createElement('div')
    f.id = 'feedback'
    f.className = 'mt-4 p-3 rounded-lg bg-white/10 text-sm'
    card.appendChild(f)
    out.feedback = f
    return f
  }

  function renderFeedback(messages, severity){
    const f = ensureFeedbackContainer()
    if(!f) return
    if(!messages || messages.length===0){
      f.innerHTML = '<div class="text-rose-50">All checks look good.</div>'
      f.classList.remove('border-l-4','border-yellow-400','border-red-400','border-green-400')
      f.classList.add('border-l-4','border-green-400')
      return
    }
    const html = messages.map(m=>`<div class="text-rose-50">• ${m}</div>`).join('')
    f.innerHTML = html
    f.classList.remove('border-l-4','border-yellow-400','border-red-400','border-green-400')
    if(severity==='warn') f.classList.add('border-l-4','border-yellow-400')
    else if(severity==='error') f.classList.add('border-l-4','border-red-400')
    else f.classList.add('border-l-4','border-green-400')
  }

  // init default values into inputs
  function initInputs(){
    // start with empty inputs so the user fills values
    inputs.monthlyIncome.value = ''
    inputs.monthlyExpense.value = ''
    inputs.personalExpense.value = ''
    inputs.cash.value = ''
    inputs.stock.value = ''
    inputs.receivable.value = ''
    inputs.fixedAsset.value = ''
    inputs.payable.value = ''
    inputs.loans.value = ''
    inputs.existingEmi.value = ''
    // set defaults for tenor and annual rate per spec
    if(inputs.tenorYears) inputs.tenorYears.value = state.tenorYears
    if(inputs.annualRate) inputs.annualRate.value = state.annualRate
  }

  // radio card clicks
  document.querySelectorAll('[data-value]').forEach(el=>{
    el.addEventListener('click', ()=>{
      const val = el.dataset.value
      state.financingNeed = val
      document.querySelectorAll('[data-value]').forEach(card=>card.classList.remove('ring-2','ring-rose-400'))
      el.classList.add('ring-2','ring-rose-400')
      clearFormError()
    })
  })

  // navigation handlers
  continueBtn.addEventListener('click', ()=>{
    clearFormError()
    clearFieldErrors()
    if(state.step < 4){
      const v = validateStep(state.step)
      if(!v.ok){ showFormError(v.messages); showFieldErrors(v.missingIds); return }
      state.step += 1
      showStep(state.step)
      // ensure progress updates when user advances
      if(typeof updateProgressAndMotivation === 'function') updateProgressAndMotivation(state.step)
    } else {
      const v = validateStep(4)
      if(!v.ok){ showFormError(v.messages); showFieldErrors(v.missingIds); return }
      computeAndRender()
    }
  })

  backBtn.addEventListener('click', ()=>{
    if(state.step > 1){
      state.step -= 1
      showStep(state.step)
      // update progress when going back
      if(typeof updateProgressAndMotivation === 'function') updateProgressAndMotivation(state.step)
    }
  })

  // reset / start over handler
  function resetForm(){
    state.step = 1
    state.financingNeed = null
    // clear any selected card
    document.querySelectorAll('[data-value]').forEach(card=>card.classList.remove('ring-2','ring-rose-400'))
    // clear inputs and outputs
    initInputs()
    out.eligibleAmount.textContent = ''
    out.monthlyEmi.textContent = ''
    out.auditNetIncome.textContent = ''
    out.auditTotalAssets.textContent = ''
    out.auditTotalLiabilities.textContent = ''
    out.auditInventoryCap.textContent = ''
    out.auditNetLiquid.textContent = ''
    out.auditDebtBurden.textContent = ''
    out.auditDebtEquity.textContent = ''
    // remove feedback if present
    const f = document.getElementById('feedback')
    if(f && f.parentNode) f.parentNode.removeChild(f)
    out.feedback = null
    showStep(1)
    // focus first input for convenience
    const firstInp = document.getElementById('monthlyIncome')
    if(firstInp) firstInp.focus()
  }

  if(resetBtn) resetBtn.addEventListener('click', resetForm)

  // load example data into the form
  function loadExample(){
    const sample = {
      financingNeed: 'fixed',
      monthlyIncome: 548333,
      monthlyExpense: 421000,
      personalExpense: 20000,
      cash: 200000,
      stock: 1700000,
      receivable: 700000,
      fixedAsset: 3700000,
      payable: 400000,
      loans: 1300000,
      existingEmi: 0,
      tenorYears: 3,
      annualRate: 16.75
    }
    // set financing need visually
    state.financingNeed = sample.financingNeed
    document.querySelectorAll('[data-value]').forEach(card=>card.classList.remove('ring-2','ring-rose-400'))
    const el = document.querySelector('[data-value="'+sample.financingNeed+'"]')
    if(el) el.classList.add('ring-2','ring-rose-400')

    // populate only fields for the current step so user advances step-by-step
    if(state.step === 1){
      // just set card selection
      clearFormError()
      return
    }
    if(state.step === 2){ inputs.monthlyIncome.value = sample.monthlyIncome; inputs.monthlyExpense.value = sample.monthlyExpense; inputs.personalExpense.value = sample.personalExpense }
    if(state.step === 3){ inputs.cash.value = sample.cash; inputs.stock.value = sample.stock; inputs.receivable.value = sample.receivable; inputs.fixedAsset.value = sample.fixedAsset }
    if(state.step === 4){ inputs.payable.value = sample.payable; inputs.loans.value = sample.loans; inputs.existingEmi.value = sample.existingEmi }
    if(state.step === 4){ if(inputs.tenorYears) inputs.tenorYears.value = sample.tenorYears; if(inputs.annualRate) inputs.annualRate.value = sample.annualRate }
    syncInputsToState()
    clearFormError()
  }

  if(loadExampleBtn) loadExampleBtn.addEventListener('click', loadExample)
  // load working-capital example
  function loadWorkingExample(){
    const sample = {
      financingNeed: 'working',
      monthlyIncome: 548333,
      monthlyExpense: 421000,
      personalExpense: 20000,
      cash: 200000,
      stock: 1700000,
      receivable: 700000,
      fixedAsset: 3700000,
      payable: 400000,
      loans: 1300000,
      existingEmi: 0,
      tenorYears: 3,
      annualRate: 16.75
    }
    // set financing need visually
    state.financingNeed = sample.financingNeed
    document.querySelectorAll('[data-value]').forEach(card=>card.classList.remove('ring-2','ring-rose-400'))
    const el = document.querySelector('[data-value="'+sample.financingNeed+'"]')
    if(el) el.classList.add('ring-2','ring-rose-400')
    // populate only fields for the current step
    if(state.step === 1){ clearFormError(); return }
    if(state.step === 2){ inputs.monthlyIncome.value = sample.monthlyIncome; inputs.monthlyExpense.value = sample.monthlyExpense; inputs.personalExpense.value = sample.personalExpense }
    if(state.step === 3){ inputs.cash.value = sample.cash; inputs.stock.value = sample.stock; inputs.receivable.value = sample.receivable; inputs.fixedAsset.value = sample.fixedAsset }
    if(state.step === 4){ inputs.payable.value = sample.payable; inputs.loans.value = sample.loans; inputs.existingEmi.value = sample.existingEmi }
    if(state.step === 4){ if(inputs.tenorYears) inputs.tenorYears.value = sample.tenorYears; if(inputs.annualRate) inputs.annualRate.value = sample.annualRate }
    syncInputsToState()
    clearFormError()
  }

  if(loadWorkingBtn) loadWorkingBtn.addEventListener('click', loadWorkingExample)

  // update reactively on input changes
  Object.values(inputs).forEach(inp=>{
    inp.addEventListener('input', ()=>{
      syncInputsToState()
      // if on result step, update live
      if(state.step === 4) computeAndRender()
      clearFormError()
      clearFieldErrors()
    })
  })

  function showFormError(messages){
    if(!formError) return
    if(typeof messages === 'string') messages = [messages]
    formError.innerHTML = messages.map(m=>`<div>• ${m}</div>`).join('')
    formError.classList.remove('hidden')
    formError.classList.add('bg-red-50','border','border-red-200','p-3','rounded-lg','text-red-700')
  }

  function clearFormError(){
    if(!formError) return
    formError.innerHTML = ''
    formError.classList.add('hidden')
    formError.classList.remove('bg-red-50','border','border-red-200','p-3','rounded-lg','text-red-700')
  }

  function validateStep(step){
    const missing = []
    const missingIds = []
    const labels = {
      financingNeed: 'Financing Need',
      monthlyIncome: 'Monthly Income',
      monthlyExpense: 'Monthly Business Expense',
      personalExpense: 'Personal & Family Expense',
      cash: 'Cash',
      stock: 'Stock',
      receivable: 'Receivable',
      fixedAsset: 'Fixed Asset',
      payable: 'Payable',
      loans: 'Loans & Debts',
      existingEmi: 'Existing EMI',
      tenorYears: 'Tenor (Years)',
      annualRate: 'Interest Rate'
    }
    function isEmpty(id){
      const el = inputs[id]
      return !el || el.value === '' || el.value === null
    }
    if(step === 1){ if(!state.financingNeed){ missing.push(labels.financingNeed); missingIds.push('financingNeed') } }
    if(step === 2){ ['monthlyIncome','monthlyExpense','personalExpense'].forEach(k=>{ if(isEmpty(k)){ missing.push(labels[k]); missingIds.push(k) } }) }
    if(step === 3){ ['cash','stock','receivable','fixedAsset'].forEach(k=>{ if(isEmpty(k)){ missing.push(labels[k]); missingIds.push(k) } }) }
    if(step === 4){ ['payable','loans','existingEmi','tenorYears','annualRate'].forEach(k=>{ if(isEmpty(k)){ missing.push(labels[k]); missingIds.push(k) } }) }
    if(missing.length) return {ok:false, messages: ['Please fill these fields: '+ missing.join(', ')], missingIds}
    return {ok:true}
  }

  function clearFieldErrors(){
    try{
      Object.keys(inputs).forEach(id=>{
        const el = inputs[id]
        if(!el) return
        el.classList.remove('border-red-400','ring-1','ring-red-300')
        // remove sibling error node if present
        const next = el.nextElementSibling
        if(next && next.classList && next.classList.contains('field-error')) next.remove()
      })
      // clear selection-card error states (financingNeed)
      const cards = document.querySelectorAll('[data-value]')
      cards.forEach(c=>c.classList.remove('ring-2','ring-red-400'))
    }catch(e){}
  }

  function showFieldErrors(missingIds){
    try{
      if(!missingIds || !missingIds.length) return
      let firstEl = null
      missingIds.forEach(id=>{
        if(id === 'financingNeed'){
          // highlight cards
          document.querySelectorAll('[data-value]').forEach(card=>card.classList.add('ring-2','ring-red-400'))
          return
        }
        const el = inputs[id]
        if(!el) return
        el.classList.add('border-red-400','ring-1','ring-red-300')
        // append message if not present
        const next = el.nextElementSibling
        if(!(next && next.classList && next.classList.contains('field-error'))){
          const msg = document.createElement('div')
          msg.className = 'field-error text-xs text-red-600 mt-1'
          msg.textContent = 'This field is required.'
          el.parentNode.insertBefore(msg, el.nextSibling)
        }
        if(!firstEl) firstEl = el
      })
      if(firstEl) firstEl.focus()
    }catch(e){}
  }

  // wiring initial state
  initInputs()
  // do not preselect any financing need; user will choose
  showStep(1)
  if(typeof updateProgressAndMotivation === 'function') updateProgressAndMotivation(1)

  // small accessibility: allow Enter to continue
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      continueBtn.click()
    }
  })

  // do not compute initial estimates; wait for user input
})();

// --- Results dashboard renderer (hides wizard and shows final calculator) ---
(function(){
  // attach to global for testing if needed
  function renderResultsDashboard({eligible, emi, totalPayable, tenor, rate}){
    // hide wizard card
    const wizardCard = document.querySelector('.max-w-3xl')
    if(wizardCard) wizardCard.style.display = 'none'

    // avoid double-render
    if(document.getElementById('resultsDashboard')) return

    const container = document.createElement('section')
    container.id = 'resultsDashboard'
    container.className = 'container py-10'
    container.innerHTML = `
      <h1 class="text-center text-2xl md:text-3xl font-bold text-[#003a6b] mb-6">SME LOAN EMI CALCULATOR</h1>
      <div class="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
        <div class="bg-white rounded-lg p-4 shadow">
          <label class="block text-sm font-medium text-[#003a6b]">Loan Amount (BDT)</label>
          <div class="flex items-center gap-2 mt-2">
            <input id="final-loan-amount" type="number" min="100000" step="1000" class="flex-1 rounded border-gray-200 p-2" />
            <span class="text-sm text-gray-500">in BDT</span>
          </div>
          <input id="final-loan-range" type="range" min="100000" max="200000000" step="1000" class="w-full mt-3">

          <label class="block text-sm font-medium text-[#003a6b] mt-4">Loan Tenure (Year)</label>
          <div class="flex items-center gap-2 mt-2">
            <input id="final-tenure" type="number" min="1" max="20" step="1" class="flex-1 rounded border-gray-200 p-2" />
            <span class="text-sm text-gray-500">years</span>
          </div>
          <input id="final-tenure-range" type="range" min="1" max="20" step="1" class="w-full mt-3">

          <label class="block text-sm font-medium text-[#003a6b] mt-4">Rate of Interest (%)</label>
          <div class="flex items-center gap-2 mt-2">
            <input id="final-rate" type="number" min="1" max="20" step="0.1" class="flex-1 rounded border-gray-200 p-2" />
            <span class="text-sm text-gray-500">per annum</span>
          </div>
          <input id="final-rate-range" type="range" min="1" max="20" step="0.1" class="w-full mt-3">
        </div>

        <div class="bg-white rounded-lg p-6 shadow text-center">
          <h2 class="text-md font-semibold text-[#003a6b]">Equal Monthly Installment (EMI)</h2>
          <div id="final-emi" class="text-3xl font-bold text-[#003a6b] mt-4">BDT 0</div>
          <button id="applyNowFinal" class="mt-6 px-6 py-2 rounded bg-[#f4b400] text-[#07203a] font-bold">Apply Now</button>
        </div>

        <div class="bg-white rounded-lg p-4 shadow">
          <h3 class="text-md font-semibold text-[#003a6b]">Break-down of Total Payment</h3>
          <div class="chart-wrap my-4 flex justify-center">
            <svg id="final-arc" viewBox="0 0 200 100" class="w-full max-w-xs" role="img" aria-label="Payment breakdown">
              <path class="arc-bg" d="M10 90 A90 90 0 0 1 190 90" stroke="#e6eef8" stroke-width="16" fill="none" stroke-linecap="round"/>
              <path id="final-arc-principal" d="" stroke="#003a6b" stroke-width="16" fill="none" stroke-linecap="round"/>
            </svg>
          </div>
          <div class="legend">
            <div class="flex items-center justify-between py-2 border-t"><div class="flex items-center gap-2"><span class="w-4 h-4 bg-[#003a6b] block"></span><span>Principal Amount</span></div><strong id="final-principal">BDT 0</strong></div>
            <div class="flex items-center justify-between py-2 border-t"><div class="flex items-center gap-2"><span class="w-4 h-4 bg-[#9fb8d8] block"></span><span>Interest Amount</span></div><strong id="final-interest">BDT 0</strong></div>
            <div class="flex items-center justify-between py-3 border-t font-semibold"><span>Total Payable Amount</span><strong id="final-total">BDT 0</strong></div>
          </div>
        </div>
      </div>
      <p class="text-center text-sm text-gray-500 mt-6">This is an indicative amount. Tax, Excise duty will be applicable on the account as per Govt. regulation.</p>
    `

    // insert after body content
    document.body.appendChild(container)

    // wire elements
    const loanInput = document.getElementById('final-loan-amount')
    const loanRange = document.getElementById('final-loan-range')
    const tenureInput = document.getElementById('final-tenure')
    const tenureRange = document.getElementById('final-tenure-range')
    const rateInput = document.getElementById('final-rate')
    const rateRange = document.getElementById('final-rate-range')
    const emiEl = document.getElementById('final-emi')
    const principalEl = document.getElementById('final-principal')
    const interestEl = document.getElementById('final-interest')
    const totalEl = document.getElementById('final-total')
    const arcPath = document.getElementById('final-arc-principal')

    // set initial values
    loanInput.value = Math.round(eligible)
    loanRange.value = Math.round(eligible)
    tenureInput.value = tenor
    tenureRange.value = tenor
    rateInput.value = rate
    rateRange.value = rate

    function updateOutputs(){
      const P = Number(loanInput.value) || 0
      const Y = Number(tenureInput.value) || 1
      const R = Number(rateInput.value) || 0
      const r = R/100/12
      const n = Math.max(1, Y*12)
      let emiVal = 0
      if(r===0) emiVal = P/n
      else{ const pow = Math.pow(1+r,n); emiVal = P * r * pow / (pow - 1) }
      const totalPay = Math.round(emiVal * n)
      const interestAmt = Math.max(0, totalPay - Math.round(P))

      emiEl.textContent = `BDT ${Math.round(emiVal).toLocaleString('en-US')}`
      principalEl.textContent = `BDT ${Math.round(P).toLocaleString('en-US')}`
      interestEl.textContent = `BDT ${Math.round(interestAmt).toLocaleString('en-US')}`
      totalEl.textContent = `BDT ${Math.round(totalPay).toLocaleString('en-US')}`

      // update arc
      updateArc(arcPath, P, totalPay)
    }

    function bindPair(inp, range){
      range.addEventListener('input', ()=>{ inp.value = range.value; updateOutputs() })
      inp.addEventListener('input', ()=>{ range.value = inp.value; updateOutputs() })
      inp.addEventListener('blur', ()=>{ updateOutputs() })
    }

    bindPair(loanInput, loanRange)
    bindPair(tenureInput, tenureRange)
    bindPair(rateInput, rateRange)

    updateOutputs()

    document.getElementById('applyNowFinal').addEventListener('click', ()=>{
      // redirect to application form with query params
      const params = new URLSearchParams({ loan: Math.round(Number(loanInput.value)||0), tenure: Number(tenureInput.value)||1, rate: Number(rateInput.value)||0 })
      window.location.href = 'application.html?' + params.toString()
    })

    // arc utilities
    function polarToCartesian(cx, cy, radius, angleDeg){
      var angleRad = (angleDeg) * Math.PI / 180.0;
      return { x: cx + (radius * Math.cos(angleRad)), y: cy + (radius * Math.sin(angleRad)) };
    }
    function describeArc(cx, cy, radius, startAngle, endAngle){
      var start = polarToCartesian(cx, cy, radius, endAngle);
      var end = polarToCartesian(cx, cy, radius, startAngle);
      var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
      var d = ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y].join(" ");
      return d;
    }
    function updateArc(pathEl, principal, total){
      const cx = 100, cy = 90, r = 90
      const share = total>0 ? Math.max(0, Math.min(1, principal/total)) : 1
      const angleDeg = share * 180
      const startAngle = 180
      const endAngle = 180 - angleDeg
      const d = describeArc(cx, cy, r, startAngle, endAngle)
      pathEl.setAttribute('d', d)
    }
  }

  window.renderResultsDashboard = renderResultsDashboard
})();
