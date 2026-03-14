# MyStory.Family — Deployment Guide

## What's in this folder
Your complete app, ready to deploy to the internet in about 10 minutes.
No coding required — just follow these steps.

---

## Step 1 — Create a free Netlify account
1. Go to **netlify.com**
2. Click "Sign up"
3. Sign up with your email

---

## Step 2 — Deploy the app (drag and drop)
1. Log into Netlify and go to your dashboard
2. You'll see a box that says "Drag and drop your site folder here"
3. Unzip the folder you downloaded, then drag the entire folder onto that box
4. Netlify detects it's a Vite/React app automatically
5. Click Deploy — in about 60 seconds you'll have a live URL
   like mystory-family-abc123.netlify.app

---

## Step 3 — Connect your domain (mystory.family)
1. In your Netlify dashboard, go to your site → Domain settings
2. Click "Add a domain" and type mystory.family
3. Netlify will show you DNS records to add
4. Log into wherever you registered mystory.family (GoDaddy, Namecheap, etc.)
5. Add those DNS records — usually takes 5-30 minutes to go live
6. Netlify gives you a free SSL certificate (the padlock) automatically

---

## Step 4 — Update Stripe with your live domain
Once mystory.family is live, confirm your Stripe Payment Link success URL is:
  https://mystory.family?payment_success=true

---

## Step 5 — Go live with real payments
When ready to take real money:
1. In Stripe dashboard, toggle from Test mode to Live mode
2. Create a new Payment Link (same settings, $99)
3. Open src/App.jsx, find line 12
4. Replace the test URL with your new live Stripe URL
5. Redeploy by dragging the folder to Netlify again

---

## Test card numbers (test mode only)
- Success:       4242 4242 4242 4242  (any future date, any CVC)
- Decline:       4000 0000 0000 0002
- Requires auth: 4000 0025 0000 3155

---

## Making updates
1. Make changes to src/App.jsx
2. Drag the whole folder to Netlify again
3. Live site updates in about 60 seconds
