// SME Shohoj Hishab Loan Estimation — app.js
(function(){
  const state = {
    step: 1,
    // load example functions removed; examples are intentionally disabled
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
    syncInputsToState()
    const c = computeAll()
    // choose eligible amount
    // consider multiple caps: debt-equity, EMI affordability, and for working-capital also net-liquid and inventory caps
    const allowedMonthlyEmi = Math.max(0, c.debtBurdenRatioLimit - state.existingEmi)
    const principalFromEmi = principalForMonthlyEmi(allowedMonthlyEmi)
    const candidates = [c.debtEquityLimit, principalFromEmi]
    if(state.financingNeed === 'working'){
      // include net liquid and inventory caps
      candidates.push(c.netLiquidAssetLimit, c.inventoryCap)
      // consider a portion of fixed assets as collateral for working capital (50% by default)
      const fixedAssetCollateral = (state.fixedAsset || 0) * 0.5
      candidates.push(fixedAssetCollateral)
    }
    let eligible = Math.min.apply(null, candidates.filter(v=>Number.isFinite(v))) || 0
    if(eligible < 0) eligible = 0

    const emi = emiFor(eligible)

    out.eligibleAmount.textContent = formatBDT(eligible,0)
    out.monthlyEmi.textContent = formatBDT(emi,2)

    out.auditNetIncome.textContent = formatBDT(c.netIncome,0)
    out.auditTotalAssets.textContent = formatBDT(c.totalAssets,0)
    out.auditTotalLiabilities.textContent = formatBDT(c.totalLiabilities,0)
    out.auditInventoryCap.textContent = formatBDT(c.inventoryCap,0)
    out.auditNetLiquid.textContent = formatBDT(c.netLiquidAssetLimit,0)
    out.auditDebtBurden.textContent = formatBDT(c.debtBurdenRatioLimit,0)
    out.auditDebtEquity.textContent = formatBDT(c.debtEquityLimit,0)

    // update tenor/rate display
    const tenorEl = document.getElementById('tenorDisplay')
    const rateEl = document.getElementById('rateDisplay')
    if(tenorEl) tenorEl.textContent = state.tenorYears
    if(rateEl) rateEl.textContent = Number(state.annualRate).toFixed(2)

    // generate user-facing feedback messages based on computed values
    const messages = []
    if(c.netIncome <= 0) messages.push('Net income is non-positive — business may not be cashflow-positive for loan servicing.')
    if(c.netLiquidAssetLimit <= 0) messages.push('Net liquid assets are negative — current stock/receivable do not cover liabilities.')
    if(state.existingEmi > 0 && (state.existingEmi * 12) > c.debtBurdenRatioLimit) messages.push('Existing EMI payments are high compared to allowable debt burden.')
    if(eligible === 0) messages.push('No eligible loan amount under current inputs. Consider reducing liabilities or increasing income.')
    else if(eligible > 0 && eligible < 100000) messages.push('Eligible amount is small; improving net income or equity will increase eligibility.')

    let severity = 'ok'
    if(messages.some(m=>/non-positive|negative|No eligible/i.test(m))) severity = 'error'
    else if(messages.length) severity = 'warn'
    renderFeedback(messages, severity)
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
    if(inputs.tenorYears) inputs.tenorYears.value = ''
    if(inputs.annualRate) inputs.annualRate.value = ''
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
    if(state.step < 5){
      const v = validateStep(state.step)
      if(!v.ok){ showFormError(v.messages); return }
      state.step += 1
      showStep(state.step)
      updateProgressAndMotivation(state.step)
    } else {
      const v = validateStep(5)
      if(!v.ok){ showFormError(v.messages); return }
      computeAndRender()
    }
  })

  backBtn.addEventListener('click', ()=>{
    if(state.step > 1){
      state.step -= 1
      showStep(state.step)
      updateProgressAndMotivation(state.step)
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
    updateProgressAndMotivation(1)
    // focus first input for convenience
    const firstInp = document.getElementById('monthlyIncome')
    if(firstInp) firstInp.focus()
  }

  if(resetBtn) resetBtn.addEventListener('click', resetForm)

  function updateProgressAndMotivation(step){
    try{
      const pct = Math.round((step / 5) * 100)
      const pctEl = document.getElementById('progressPercent')
      const fill = document.getElementById('progressBarFill')
      const mot = document.getElementById('motivational')
      if(pctEl) pctEl.textContent = pct + '%'
      if(fill) fill.style.width = pct + '%'
      if(mot){
        const msgs = {
          1: 'You\'re off to a great start — choose the financing you need.',
          2: 'Nice! Tell us about your monthly income to estimate affordability.',
          3: 'Good progress — provide your business assets to help improve eligibility.',
          4: 'Almost there — add liabilities so we can finalize the assessment.',
          5: 'Final step — review and calculate your eligible loan amount.'
        }
        mot.textContent = msgs[step] || ''
      }
    }catch(e){/* ignore */}
  }

  // Example loaders removed to encourage manual step-by-step input

  // update reactively on input changes
  Object.values(inputs).forEach(inp=>{
    inp.addEventListener('input', ()=>{
      syncInputsToState()
      // if on result step, update live
      if(state.step === 5) computeAndRender()
      clearFormError()
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
    if(step === 1){ if(!state.financingNeed) missing.push(labels.financingNeed) }
    if(step === 2){ ['monthlyIncome','monthlyExpense','personalExpense'].forEach(k=>{ if(isEmpty(k)) missing.push(labels[k]) }) }
    if(step === 3){ ['cash','stock','receivable','fixedAsset'].forEach(k=>{ if(isEmpty(k)) missing.push(labels[k]) }) }
    if(step === 4){ ['payable','loans','existingEmi'].forEach(k=>{ if(isEmpty(k)) missing.push(labels[k]) }) }
    if(step === 5){ if(!state.financingNeed) missing.push(labels.financingNeed); Object.keys(labels).forEach(k=>{ if(k!=='financingNeed' && isEmpty(k)) missing.push(labels[k]) }) }
    if(missing.length) return {ok:false, messages: ['Please fill these fields: '+ missing.join(', ')]}
    return {ok:true}
  }

  // wiring initial state
  initInputs()
  // do not preselect any financing need; user will choose
  showStep(1)
  updateProgressAndMotivation(1)

  // small accessibility: allow Enter to continue
  document.addEventListener('keydown', (e)=>{
    if(e.key==='Enter'){
      continueBtn.click()
    }
  })

  // do not compute initial estimates; wait for user input
})();
