<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/f27fa886-2d43-4472-bb52-04627d07d7e9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app (Express + Vite, có `/api/health`):
   `npm run dev`

### Build & production

- **Không** `vite preview` một mình — không có backend. Sau build: `npm start` hoặc `npm run preview` (chạy `tsx server.ts` + `dist`).
- Cloud Run / Docker: `CMD` là `npm start` (hoặc `tsx server.ts`), `PORT` do nền tảng gán.

Xem `Dockerfile` để deploy container.
