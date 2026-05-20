# NC/NV Partner Outreach Dashboard

A web dashboard for Relationship Managers to track and manage NC/NV partners.

## Quick Setup
See the full guide in the chat / `SETUP_GUIDE.md`.

## Stack
- **Frontend**: Vanilla HTML/CSS/JS → hosted on Vercel
- **Backend**: Google Apps Script (Web App) → connected to Google Sheets
- **Data**: Google Sheets (Partners_Master + RM_Users + Call_Tracker)

## After deployment
1. Copy your Apps Script Web App URL
2. Paste it into `js/app.js` → `const API_URL = 'YOUR_URL'`
3. Push to GitHub → Vercel auto-deploys
