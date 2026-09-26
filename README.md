# Tofi Quant — vault website

Static landing page for the Tofi Quant vault on ApeX Omni:
https://omni.apex.exchange/en-US/vault/info/2102639973684609024

- Live TVL, share price (NAV), returns, max drawdown, depositors and a NAV chart,
  pulled in the browser from the public ApeX Omni API (refreshes every 60 s).
- English / Bulgarian toggle (auto-detects the browser language).
- "Join the vault" buttons open the vault page on ApeX Omni.
- No build step, no dependencies: `index.html`, `styles.css`, `app.js`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

## Publish (GitHub Pages)

1. Merge this branch into `main`.
2. In the repo go to **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The `Deploy to GitHub Pages` workflow publishes the site at
   `https://<user>.github.io/<repo>/`.

## Change the vault

Edit `VAULT_ID` at the top of `app.js`.
