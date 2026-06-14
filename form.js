// form.js - handles prefill from calculator and form validation
(function(){
  function qs(key){
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
  }

  // Prefill requestedAmount and tenure if present in query params
  const requestedAmountEl = document.getElementById('requestedAmount');
  const tenureEl = document.getElementById('tenure');
  const phoneEl = document.getElementById('phone');

  const loan = qs('loan');
  const tenure = qs('tenure');
  const rate = qs('rate');

  if(loan && requestedAmountEl){
    requestedAmountEl.value = Number(loan);
  }
  if(tenure && tenureEl){
    tenureEl.value = Number(tenure);
  }

  // Simple validation and submit handler
  const form = document.getElementById('smeForm');
  const message = document.getElementById('formMessage');

  function showError(msg){
    message.textContent = msg;
    message.classList.remove('hidden');
    message.classList.add('block');
  }
  function clearError(){
    message.textContent = '';
    message.classList.add('hidden');
  }

  form.addEventListener('submit', function(e){
    e.preventDefault();
    clearError();

    // required fields check
    const fullName = form.fullName.value.trim();
    const dob = form.dob.value;
    const phone = form.phone.value.trim();
    const consent = form.consent.checked;

    if(!fullName) return showError('Please enter your full name.');
    if(!dob) return showError('Please enter your date of birth.');
    if(!phone) return showError('Please provide a contact number.');
    if(!consent) return showError('You must agree to the declaration to proceed.');

    // gather form data
    const data = new FormData(form);
    const payload = {};
    data.forEach((v,k)=>payload[k]=v);
    payload.consented = consent;

    // For demo purposes, we'll log and show success message.
    console.log('SME Loan Application:', payload);
    message.classList.remove('text-red-600');
    message.classList.add('text-green-700');
    message.textContent = 'Application submitted successfully (demo). We will contact you shortly.';
    message.classList.remove('hidden');

    // Optionally: send to server via fetch
    // fetch('/api/loan', {method:'POST', body: JSON.stringify(payload)})
    //   .then(()=>{ /* success */ })
  });
})();
