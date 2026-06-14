BRAC Bank SME Shohoj Hishab loan estimation calculator.

## Local development

```powershell
cd "D:\sme-loan_calculator-main"
python -m http.server 8000
```

Open http://localhost:8000

Or run:

```powershell
.\serve.ps1
```

## Pages

- `/` — main EMI calculator (wizard + estimate)
- `/application.html` — loan application form
- `/wizard.html` — conversational wizard flow

## Deploy to Vercel

This is a static site. Connect the GitHub repo in Vercel and deploy with no build command. The root `index.html` is served at your production domain.
