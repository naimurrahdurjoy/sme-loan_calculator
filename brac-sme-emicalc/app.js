// BRAC Bank SME Loan EMI Calculator
// - Syncs inputs and sliders
// - Calculates EMI, total interest and updates a semicircular SVG arc

(function(){
  // DOM references
  const loanInput = document.getElementById('loan-amount');
  const loanRange = document.getElementById('loan-amount-range');
  const tenureInput = document.getElementById('tenure-years');
  const tenureRange = document.getElementById('tenure-range');
  const rateInput = document.getElementById('interest-rate');
  const rateRange = document.getElementById('interest-range');

  const emiValue = document.getElementById('emi-value');
  const principalValue = document.getElementById('principal-value');
  const interestValue = document.getElementById('interest-value');
  const totalValue = document.getElementById('total-value');
  const arcPrincipal = document.getElementById('arc-principal');

  // sensible defaults
  const DEFAULTS = { loan:100000, tenure:1, rate:10 };

  // initialize inputs
  function init(){
    loanInput.value = DEFAULTS.loan;
    loanRange.value = DEFAULTS.loan;
    tenureInput.value = DEFAULTS.tenure;
    tenureRange.value = DEFAULTS.tenure;
    rateInput.value = DEFAULTS.rate;
    rateRange.value = DEFAULTS.rate;
    calculateAndUpdate();
  }

  // format numbers with commas
  function fmt(n){
    return n.toLocaleString('en-US');
  }

  // EMI formula
  function calcEMI(P, annualRate, years){
    const monthlyRate = annualRate/12/100;
    const n = years*12;
    if(monthlyRate === 0) return P/n;
    const r = monthlyRate;
    const emi = P * r * Math.pow(1+r, n) / (Math.pow(1+r, n) - 1);
    return emi;
  }

  // Describe an arc path (semi-circle based)
  function polarToCartesian(cx, cy, radius, angleDeg){
    var angleRad = (angleDeg) * Math.PI / 180.0;
    return {
      x: cx + (radius * Math.cos(angleRad)),
      y: cy + (radius * Math.sin(angleRad))
    };
  }

  function describeArc(cx, cy, radius, startAngle, endAngle){
    var start = polarToCartesian(cx, cy, radius, endAngle);
    var end = polarToCartesian(cx, cy, radius, startAngle);
    var largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    var d = [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
    return d;
  }

  // Update the semicircular arc to represent principal share
  function updateArc(principal, totalPayable){
    const cx = 100, cy = 90, r = 90;
    const principalShare = Math.max(0, Math.min(1, principal/totalPayable || 0));
    // map to angle between 0 -> 180 (start at left=180deg to right=0deg)
    const angleDeg = principalShare * 180;
    const startAngle = 180;
    const endAngle = 180 - angleDeg;
    const d = describeArc(cx, cy, r, startAngle, endAngle);
    arcPrincipal.setAttribute('d', d);
  }

  // Calculate everything and update DOM
  function calculateAndUpdate(){
    const P = Number(loanInput.value) || 0;
    const years = Number(tenureInput.value) || 0;
    const R = Number(rateInput.value) || 0;

    const emi = calcEMI(P, R, years);
    const n = years*12;
    const totalPayable = emi * n;
    const totalInterest = totalPayable - P;

    emiValue.textContent = `BDT ${fmt(Math.round(emi))}`;
    principalValue.textContent = `BDT ${fmt(Math.round(P))}`;
    interestValue.textContent = `BDT ${fmt(Math.round(totalInterest))}`;
    totalValue.textContent = `BDT ${fmt(Math.round(totalPayable))}`;

    // Update arc (principal proportion)
    updateArc(P, totalPayable);
  }

  // Two-way sync helpers
  function bindPair(numberEl, rangeEl, transform){
    rangeEl.addEventListener('input',()=>{
      numberEl.value = rangeEl.value;
      if(transform) transform(rangeEl.value);
      calculateAndUpdate();
    });
    numberEl.addEventListener('input',()=>{
      let v = Number(numberEl.value);
      // clamp
      const min = Number(rangeEl.min||0);
      const max = Number(rangeEl.max||1e12);
      if(isNaN(v)) v = min;
      v = Math.max(min, Math.min(max, v));
      rangeEl.value = v;
      calculateAndUpdate();
    });

    // keyboard accessibility: update on blur as well
    numberEl.addEventListener('blur', ()=>{
      // ensure it's rounded appropriately
      if(rangeEl.step && Number(rangeEl.step) >= 1){
        numberEl.value = Math.round(Number(numberEl.value));
        rangeEl.value = numberEl.value;
        calculateAndUpdate();
      }
    });
  }

  // Wire up pairs
  bindPair(loanInput, loanRange);
  bindPair(tenureInput, tenureRange);
  bindPair(rateInput, rateRange);

  // initialize
  init();

  // small UX: clicking Apply Now - redirect to application form and prefill values via query params
  document.getElementById('apply-btn').addEventListener('click', ()=>{
    const P = Number(loanInput.value) || 0;
    const years = Number(tenureInput.value) || 0;
    const R = Number(rateInput.value) || 0;
    const params = new URLSearchParams({ loan: Math.round(P), tenure: years, rate: R });
    window.location.href = `application.html?${params.toString()}`;
  });

})();