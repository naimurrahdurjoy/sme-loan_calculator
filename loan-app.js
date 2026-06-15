/**
 * BRAC Bank SME Shohoj Hishab — Wizard + EMI Calculator
 * Stage 1: Multi-step questionnaire (visible on load)
 * Stage 2: SME_ShohojHishab_LoanEstimation_301225 calculation engine
 * Stage 3: EMI dashboard reveal (hidden until Calculate Estimate)
 */
(function () {
  'use strict';

  const CLAUSE_C = 2416836; // Debt Burden Constrained Maximum
  const CLAUSE_D = 1520000; // Debt Equity Constrained Maximum

  const TOTAL_STEPS = 4;
  let currentStep = 1;
  let financingNeed = null;

  // ── DOM: Wizard ──────────────────────────────────────────────
  const stageWizard = document.getElementById('stage-wizard');
  const stageDashboard = document.getElementById('stage-dashboard');
  const form = document.getElementById('wizardForm');
  const stepPanels = Array.from(document.querySelectorAll('#stage-wizard .step-panel'));
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const progressFill = document.getElementById('progressFill');
  const progressLabel = document.getElementById('progressLabel');
  const stepMotivation = document.getElementById('stepMotivation');
  const financingError = document.getElementById('financingError');

  const MOTIVATIONS = {
    1: "You're off to a great start — choose the financing you need.",
    2: 'Nice — tell us about monthly income and expenses to estimate affordability.',
    3: 'Good progress — add your business assets to increase eligibility.',
    4: 'Almost there — include liabilities and loan parameters, then calculate.'
  };

  // ── DOM: Dashboard ───────────────────────────────────────────
  const loanInput = document.getElementById('loan-amount');
  const loanRange = document.getElementById('loan-amount-range');
  const tenureInput = document.getElementById('tenure-years');
  const tenureRange = document.getElementById('tenure-range');
  const rateInput = document.getElementById('interest-rate');
  const rateRange = document.getElementById('interest-range');
  const emiValue = document.getElementById('emi-value');
  const principalValue = document.getElementById('principal-value');
  const interestValueEl = document.getElementById('interest-value');
  const totalValue = document.getElementById('total-value');
  const arcPrincipal = document.getElementById('arc-principal');
  const arcInterest = document.getElementById('arc-interest');
  const applyBtn = document.getElementById('apply-btn');
  const backToAssessmentBtn = document.getElementById('backToAssessmentBtn');
  const stageRejected = document.getElementById('stage-rejected');
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  const brandLogoLink = document.querySelector('.brand');

  let cachedResult = null;

  // ── Formatting & EMI math ──────────────────────────────────────
  function fmt(n) {
    return Math.round(Number(n) || 0).toLocaleString('en-US');
  }

  function fmtBDT(n, decimals) {
    const d = decimals != null ? decimals : 0;
    return 'BDT ' + (Number(n) || 0).toLocaleString('en-US', {
      minimumFractionDigits: d,
      maximumFractionDigits: d
    });
  }

  function calcEMI(principal, annualRate, years) {
    const P = Number(principal) || 0;
    const r = (Number(annualRate) || 0) / 12 / 100;
    const n = Math.max(1, (Number(years) || 1) * 12);
    if (P <= 0) return 0;
    if (r === 0) return P / n;
    const pow = Math.pow(1 + r, n);
    return P * r * pow / (pow - 1);
  }

  // ── Stage 2: Calculation Engine ──────────────────────────────
  function gatherFormData() {
    return {
      financingNeed,
      monthlyIncome: Number(form.monthlyIncome.value) || 0,
      businessExpense: Number(form.businessExpense.value) || 0,
      personalExpense: Number(form.personalExpense.value) || 0,
      existingEmi: Number(form.existingEmi.value) || 0,
      cash: Number(form.cash.value) || 0,
      stock: Number(form.stock.value) || 0,
      receivable: Number(form.receivable.value) || 0,
      fixedAsset: Number(form.fixedAsset.value) || 0,
      payable: Number(form.payable.value) || 0,
      loans: Number(form.loans.value) || 0,
      tenorYears: Number(form.tenorYears.value) || 3,
      interestRate: Number(form.interestRate.value) || 16.75
    };
  }

  function runEstimationEngine(data) {
    const netIncome = data.monthlyIncome - data.businessExpense - data.personalExpense - data.existingEmi;
    const totalAssets = data.cash + data.stock + data.receivable + data.fixedAsset;
    const totalLiability = data.payable + data.loans;

    const clauseA = (data.stock + data.receivable) * 0.70;
    const clauseB = data.stock + data.receivable - totalLiability;

    let eligibleLoanAmount = 0;
    if (data.financingNeed === 'fixed') {
      eligibleLoanAmount = CLAUSE_D;
    } else if (data.financingNeed === 'working') {
      eligibleLoanAmount = Math.max(0, clauseB);
    }

    const monthlyEmi = calcEMI(eligibleLoanAmount, data.interestRate, data.tenorYears);

    return {
      netIncome,
      totalAssets,
      totalLiability,
      clauseA,
      clauseB,
      clauseC: CLAUSE_C,
      clauseD: CLAUSE_D,
      eligibleLoanAmount,
      monthlyEmi,
      tenorYears: data.tenorYears,
      interestRate: data.interestRate
    };
  }

  // ── Wizard navigation ──────────────────────────────────────────
  function showStep(step) {
    currentStep = step;
    stepPanels.forEach(function (panel) {
      const n = Number(panel.dataset.step);
      panel.classList.toggle('hidden', n !== step);
    });
    backBtn.classList.toggle('hidden', step === 1);
    nextBtn.textContent = step === TOTAL_STEPS ? 'Calculate Estimate' : 'Continue';
    progressFill.style.width = ((step / TOTAL_STEPS) * 100) + '%';
    progressLabel.textContent = 'Step ' + step + ' of ' + TOTAL_STEPS;
    if (stepMotivation) stepMotivation.textContent = MOTIVATIONS[step] || '';
  }

  function validateStep(step) {
    financingError.classList.add('hidden');
    document.querySelectorAll('.field-error-inline').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.field input').forEach(function (inp) {
      inp.classList.remove('input-invalid');
    });

    if (step === 1) {
      if (!financingNeed) {
        financingError.classList.remove('hidden');
        return false;
      }
      return true;
    }

    const panel = stepPanels[step - 1];
    const required = panel.querySelectorAll('[required]');
    let valid = true;
    required.forEach(function (inp) {
      if (inp.value === '' || inp.value == null) {
        valid = false;
        inp.classList.add('input-invalid');
        var msg = document.createElement('p');
        msg.className = 'field-error-inline';
        msg.textContent = 'This field is required.';
        inp.parentNode.appendChild(msg);
      }
    });
    return valid;
  }

  // Financing type selection
  document.querySelectorAll('.select-card').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.select-card').forEach(function (b) {
        b.classList.remove('selected');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('selected');
      btn.setAttribute('aria-pressed', 'true');
      financingNeed = btn.dataset.value;
      financingError.classList.add('hidden');
    });
  });

  backBtn.addEventListener('click', function () {
    if (currentStep > 1) showStep(currentStep - 1);
  });

  nextBtn.addEventListener('click', function () {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) {
      showStep(currentStep + 1);
    } else {
      submitWizard();
    }
  });

  // ── Stage 3: Reveal dashboard ──────────────────────────────────
  function submitWizard() {
    var data = gatherFormData();
    var result = runEstimationEngine(data);

    if (result.netIncome <= 0 || (data.stock + data.receivable) <= result.totalLiability) {
      return showRejection(result, data);
    }

    cachedResult = result;
    revealDashboard(result);
  }

  function showRejection(result, data) {
    stageWizard.classList.add('hidden');
    stageWizard.setAttribute('aria-hidden', 'true');
    stageDashboard.classList.add('hidden');
    stageDashboard.setAttribute('aria-hidden', 'true');
    stageRejected.classList.remove('hidden');
    stageRejected.setAttribute('aria-hidden', 'false');

    document.getElementById('reject-reason-netincome').textContent = result.netIncome <= 0
      ? 'Net income is insufficient after expenses.'
      : 'Net income is enough to operate but not enough for bank-backed repayment coverage.';

    document.getElementById('reject-reason-assets').textContent = (data.stock + data.receivable) <= result.totalLiability
      ? 'Short-term asset coverage does not meet current liability needs.'
      : 'Short-term asset coverage is below baseline bank credit metrics.';
  }

  function revealDashboard(result) {
    stageWizard.classList.add('hidden');
    stageWizard.setAttribute('aria-hidden', 'true');
    stageRejected.classList.add('hidden');
    stageRejected.setAttribute('aria-hidden', 'true');

    stageDashboard.classList.remove('hidden');
    stageDashboard.setAttribute('aria-hidden', 'false');

    var loan = Math.round(result.eligibleLoanAmount);
    loanInput.value = loan;
    loanRange.value = loan;
    tenureInput.value = result.tenorYears;
    tenureRange.value = result.tenorYears;
    rateInput.value = result.interestRate;
    rateRange.value = result.interestRate;

    updateDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Dashboard: synced inputs & arc chart ───────────────────────
  function polarToCartesian(cx, cy, radius, angleDeg) {
    var angleRad = angleDeg * Math.PI / 180;
    return {
      x: cx + radius * Math.cos(angleRad),
      y: cy + radius * Math.sin(angleRad)
    };
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    var start = polarToCartesian(cx, cy, radius, endAngle);
    var end = polarToCartesian(cx, cy, radius, startAngle);
    var largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', start.x, start.y, 'A', radius, radius, 0, largeArc, 0, end.x, end.y].join(' ');
  }

  function updateArc(principal, totalPayable) {
    var cx = 100, cy = 90, r = 90;
    var principalShare = totalPayable > 0 ? Math.max(0, Math.min(1, principal / totalPayable)) : 1;
    var angleDeg = principalShare * 180;
    var startAngle = 180;
    var splitAngle = 180 - angleDeg;

    arcPrincipal.setAttribute('d', describeArc(cx, cy, r, startAngle, splitAngle));

    if (principalShare < 1) {
      arcInterest.setAttribute('d', describeArc(cx, cy, r, splitAngle, 0));
    } else {
      arcInterest.setAttribute('d', '');
    }
  }

  function updateDashboard() {
    var P = Number(loanInput.value) || 0;
    var years = Number(tenureInput.value) || 1;
    var R = Number(rateInput.value) || 0;

    var emi = calcEMI(P, R, years);
    var n = years * 12;
    var totalPayable = Math.round(emi * n);
    var totalInterest = Math.max(0, totalPayable - Math.round(P));

    emiValue.textContent = fmtBDT(emi, 0);
    principalValue.textContent = fmt(P);
    interestValueEl.textContent = fmt(totalInterest);
    totalValue.textContent = fmt(totalPayable);

    updateArc(P, totalPayable);
  }

  function bindPair(numberEl, rangeEl) {
    rangeEl.addEventListener('input', function () {
      numberEl.value = rangeEl.value;
      updateDashboard();
    });
    numberEl.addEventListener('input', function () {
      var v = Number(numberEl.value);
      var min = Number(rangeEl.min) || 0;
      var max = Number(rangeEl.max) || 1e12;
      if (isNaN(v)) v = min;
      v = Math.max(min, Math.min(max, v));
      rangeEl.value = v;
      updateDashboard();
    });
    numberEl.addEventListener('blur', updateDashboard);
  }

  bindPair(loanInput, loanRange);
  bindPair(tenureInput, tenureRange);
  bindPair(rateInput, rateRange);

  applyBtn.addEventListener('click', function () {
    var params = new URLSearchParams({
      loan: Math.round(Number(loanInput.value) || 0),
      tenure: Number(tenureInput.value) || 1,
      rate: Number(rateInput.value) || 0
    });
    window.location.href = 'application.html?' + params.toString();
  });

  backToAssessmentBtn.addEventListener('click', function () {
    stageDashboard.classList.add('hidden');
    stageDashboard.setAttribute('aria-hidden', 'true');
    stageRejected.classList.add('hidden');
    stageRejected.setAttribute('aria-hidden', 'true');
    stageWizard.classList.remove('hidden');
    stageWizard.setAttribute('aria-hidden', 'false');
    showStep(TOTAL_STEPS);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  tryAgainBtn.addEventListener('click', function () {
    stageRejected.classList.add('hidden');
    stageRejected.setAttribute('aria-hidden', 'true');
    stageWizard.classList.remove('hidden');
    stageWizard.setAttribute('aria-hidden', 'false');
    showStep(1);
    resetFormState();
  });

  brandLogoLink.addEventListener('click', function (event) {
    event.preventDefault();
    resetFormState();
    stageDashboard.classList.add('hidden');
    stageDashboard.setAttribute('aria-hidden', 'true');
    stageRejected.classList.add('hidden');
    stageRejected.setAttribute('aria-hidden', 'true');
    stageWizard.classList.remove('hidden');
    stageWizard.setAttribute('aria-hidden', 'false');
    showStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  function resetFormState() {
    financingNeed = null;
    cachedResult = null;
    form.reset();
    document.querySelectorAll('.select-card').forEach(function (btn) {
      btn.classList.remove('selected');
      btn.setAttribute('aria-pressed', 'false');
    });
    document.querySelectorAll('.field-error-inline').forEach(function (el) { el.remove(); });
    document.querySelectorAll('.input-invalid').forEach(function (inp) { inp.classList.remove('input-invalid'); });
    financingError.classList.add('hidden');
    form.tenorYears.value = 3;
    form.interestRate.value = 16.75;
  }

  // ── Init: wizard visible, dashboard hidden ─────────────────────
  resetFormState();
  showStep(1);
})();
