Minimal single-page app for the conversational calculator.

Quick start

- Open `c:\Users\naimu\OneDrive\Desktop\crab-sme-estimator\index.html` in a browser (double-click) OR serve the folder locally.

Serve with PowerShell (recommended):

```powershell
cd "c:\Users\naimu\OneDrive\Desktop\crab-sme-estimator"
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Or use the provided PowerShell helper:

```powershell
.\serve.ps1
```

Files

- `index.html` — main single-page app
- `app.js` — frontend calculator logic and wizard navigation
- `README.md` — this file

Calculator notes

- Tenor is hardcoded to 3 years; rate is hardcoded to 16.75%.
- With the provided defaults the app shows:
  - Working Capital eligible: BDT 700,000 (EMI ≈ BDT 24,869.90)
  - Fixed Asset eligible: BDT 1,520,000 (EMI ≈ BDT 54,003.21)
