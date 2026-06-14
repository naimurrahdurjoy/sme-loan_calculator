// wizard.js - 5-step SME Shohoj Hishab wizard
(function(){
  const form = document.getElementById('wizardForm');
  const steps = Array.from(document.querySelectorAll('.step-panel'));
  const totalSteps = steps.length;
  let current = 0; // 0-indexed

  const progressEl = document.getElementById('progress');
  const stepTemplate = document.getElementById('step-template');

  // render progress steps
  function renderProgress(){
    progressEl.innerHTML = '';
    for(let i=0;i<totalSteps;i++){
      const clone = stepTemplate.content.cloneNode(true);
      clone.querySelector('.step-num').textContent = i+1;
      const fill = clone.querySelector('.step-fill');
      if(i<current) fill.style.width = '100%';
      else if(i===current) fill.style.width = '50%';
      else fill.style.width = '0%';
      progressEl.appendChild(clone);
    }
  }

  function showStep(index){
    steps.forEach((s,i)=>{
      if(i===index) s.classList.remove('hidden'); else s.classList.add('hidden');
    });
    current = index;
    renderProgress();
    document.getElementById('backBtn').classList.toggle('hidden', current===0);
    const nextBtn = document.getElementById('nextBtn');
    if(current===totalSteps-1){ nextBtn.textContent = 'Calculate Estimate'; }
    else nextBtn.textContent = 'Continue';
  }

  // selection cards for step1
  document.querySelectorAll('.select-card').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.select-card').forEach(b=>{
        b.classList.remove('ring-2','ring-offset-1','ring-[#003a6b]');
        b.setAttribute('aria-pressed','false');
      });
      btn.classList.add('ring-2','ring-offset-1','ring-[#003a6b]');
      btn.setAttribute('aria-pressed','true');
      // save to form
      form.dataset.financing = btn.dataset.value;
    });
  });

  // basic validation for required fields in current step
  function validateCurrentStep(){
    const active = steps[current];
    let valid = true;
    const requiredEls = Array.from(active.querySelectorAll('[required]'));
    requiredEls.forEach(el=>{
      const err = el.parentElement.querySelector('.field-error');
      if(!el.value || el.value.trim()===''){
        valid = false;
        if(err) err.classList.remove('hidden');
        el.classList.add('border-red-400');
      } else {
        if(err) err.classList.add('hidden');
        el.classList.remove('border-red-400');
      }
    });
    // additional: ensure financing type selected for step1
    if(current===0){
      const selected = form.dataset.financing;
      if(!selected){ valid=false; alert('Please select a financing type to continue.'); }
    }
    return valid;
  }

  document.getElementById('nextBtn').addEventListener('click', ()=>{
    if(current < totalSteps -1){
      if(!validateCurrentStep()) return;
      showStep(current+1);
    } else {
      // calculate
      if(!validateCurrentStep()) return;
      calculateEstimate();
    }
  });

  document.getElementById('backBtn').addEventListener('click', ()=>{
    if(current>0) showStep(current-1);
  });

  // start over
  document.getElementById('startOver').addEventListener('click', ()=>{
    form.reset();
    delete form.dataset.financing;
    document.querySelectorAll('.select-card').forEach(b=>{ b.classList.remove('ring-2','ring-offset-1','ring-[#003a6b]'); b.setAttribute('aria-pressed','false'); });
    showStep(0);
    // clear outputs
    document.getElementById('eligibleAmount').textContent = 'BDT 0';
    document.getElementById('monthlyEmi').textContent = 'BDT 0';
    document.getElementById('emiParams').textContent = 'Tenor: 3 years • Rate: 16.75%';
    document.getElementById('auditDetails').textContent = '';
  });

  // Calculation logic using inputs across steps
  function calculateEstimate(){
    // gather step2
    const monthlyIncome = Number(form.monthlyIncome.value) || 0;
    const businessExpense = Number(form.businessExpense.value) || 0;
    const personalExpense = Number(form.personalExpense.value) || 0;

    // step3
    const cash = Number(form.cash.value) || 0;
    const stock = Number(form.stock.value) || 0;
    const receivable = Number(form.receivable.value) || 0;
    const fixedAsset = Number(form.fixedAsset.value) || 0;

    // step4
    const payable = Number(form.payable.value) || 0;
    const loans = Number(form.loans.value) || 0;
    const existingEmi = Number(form.existingEmi.value) || 0;

    // step5 overrides
    const tenorYears = Number(document.getElementById('tenorYears').value) || 1;
    const annualRate = Number(document.getElementById('annualRate').value) || 0;

    // derived
    const netMonthlyIncome = Math.max(0, monthlyIncome - businessExpense - personalExpense);
    const annualNetIncome = netMonthlyIncome * 12;
    const totalAssets = cash + stock + receivable + fixedAsset;
    const totalLiabilities = payable + loans + (existingEmi * 12);
    const netAssets = Math.max(0, totalAssets - totalLiabilities);

    // simple eligibility rule: 60% of (netAssets + annualNetIncome)
    const eligible = Math.max(0, Math.floor((netAssets + annualNetIncome) * 0.6));

    // compute EMI for eligible amount
    const emi = computeEmi(eligible, annualRate, tenorYears);
    const n = tenorYears * 12;
    const totalPayable = Math.round(emi * n);

    document.getElementById('eligibleAmount').textContent = `BDT ${eligible.toLocaleString('en-US')}`;
    document.getElementById('monthlyEmi').textContent = `BDT ${Math.round(emi).toLocaleString('en-US')}`;
    document.getElementById('emiParams').textContent = `Tenor: ${tenorYears} years • Rate: ${annualRate}%`;

    // audit details
    const audit = `Net Monthly Income: BDT ${netMonthlyIncome.toLocaleString('en-US')}. Total Assets: BDT ${totalAssets.toLocaleString('en-US')}. Total Liabilities: BDT ${totalLiabilities.toLocaleString('en-US')}. Eligible Amount (60% rule): BDT ${eligible.toLocaleString('en-US')}. Total Payable (EMI*${n}): BDT ${totalPayable.toLocaleString('en-US')}.`;
    document.getElementById('auditDetails').textContent = audit;

    // Move to final Stage 2 calculator and populate values
    showFinalCalculator({eligible, emi, totalPayable, tenorYears, annualRate});
  }

  function computeEmi(P, annualRate, years){
    const r = annualRate/12/100;
    const n = years*12;
    if(n===0) return 0;
    if(r===0) return P/n;
    const emi = P * r * Math.pow(1+r,n) / (Math.pow(1+r,n)-1);
    return emi;
  }

  // initialize
  showStep(0);
  renderProgress();

  // --- Final calculator integration ---
  const wizardContainer = document.querySelector('.max-w-4xl');
  const stage2 = document.getElementById('stage2');

  function showFinalCalculator({eligible, emi, totalPayable, tenorYears, annualRate}){
    // hide wizard
    if(wizardContainer) wizardContainer.classList.add('hidden');
    stage2.classList.remove('hidden');

    // populate final inputs
    const loanInput = document.getElementById('final-loan-amount');
    const loanRange = document.getElementById('final-loan-range');
    const tenureInput = document.getElementById('final-tenure');
    const tenureRange = document.getElementById('final-tenure-range');
    const rateInput = document.getElementById('final-rate');
    const rateRange = document.getElementById('final-rate-range');

    const principalEl = document.getElementById('final-principal');
    const interestEl = document.getElementById('final-interest');
    const totalEl = document.getElementById('final-total');
    const emiEl = document.getElementById('final-emi');
    const arcPath = document.getElementById('final-arc-principal');

    // clamp eligible to slider min/max
    const minLoan = Number(loanRange.min || 100000);
    const maxLoan = Number(loanRange.max || 200000000);
    const loanVal = Math.max(minLoan, Math.min(maxLoan, Math.round(eligible)));
    loanInput.value = loanVal;
    loanRange.value = loanVal;

    tenureInput.value = tenorYears;
    tenureRange.value = tenorYears;

    rateInput.value = annualRate;
    rateRange.value = annualRate;

    // compute display values
    updateFinalOutputs();

    // bind two-way
    bindFinalPair(loanInput, loanRange, updateFinalOutputs);
    bindFinalPair(tenureInput, tenureRange, updateFinalOutputs);
    bindFinalPair(rateInput, rateRange, updateFinalOutputs);

    document.getElementById('applyNowFinal').addEventListener('click', ()=>{
      alert('Apply Now clicked — redirect to application form (placeholder)');
    });

    function updateFinalOutputs(){
      const P = Number(loanInput.value) || 0;
      const years = Number(tenureInput.value) || 0;
      const R = Number(rateInput.value) || 0;
      const emiVal = computeEmi(P, R, years);
      const n = Math.max(1, years*12);
      const totalPayableVal = Math.round(emiVal * n);
      const totalInterestVal = Math.max(0, totalPayableVal - Math.round(P));

      emiEl.textContent = `BDT ${Math.round(emiVal).toLocaleString('en-US')}`;
      principalEl.textContent = `BDT ${Math.round(P).toLocaleString('en-US')}`;
      interestEl.textContent = `BDT ${Math.round(totalInterestVal).toLocaleString('en-US')}`;
      totalEl.textContent = `BDT ${Math.round(totalPayableVal).toLocaleString('en-US')}`;

      // update arc
      updateArc(arcPath, P, totalPayableVal);
    }

    function bindFinalPair(numberEl, rangeEl, cb){
      rangeEl.addEventListener('input', ()=>{ numberEl.value = rangeEl.value; cb(); });
      numberEl.addEventListener('input', ()=>{ rangeEl.value = numberEl.value; cb(); });
      numberEl.addEventListener('blur', ()=>{ cb(); });
    }

    // arc updater
    function updateArc(pathEl, principal, total){
      const cx = 100, cy = 90, r = 90;
      const share = total>0 ? Math.max(0, Math.min(1, principal/total)) : 1;
      const angleDeg = share * 180;
      const startAngle = 180;
      const endAngle = 180 - angleDeg;
      const d = describeArc(cx, cy, r, startAngle, endAngle);
      pathEl.setAttribute('d', d);
    }

    // expose describeArc from local scope (reuse function from above)
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
  }

})();
