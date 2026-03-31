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
3. Run the app (Express + Vite, có API `/api` và OAuth `/auth`):
   `npm run dev`

### Google Sheets & OAuth

- **Không** dùng lệnh `vite preview` một mình — không có backend, `/api/auth/url` sẽ **404**.
- Sau khi build: `npm start` hoặc `npm run preview` (cả hai chạy `tsx server.ts` + thư mục `dist`).
- Cloud Run / Docker: `CMD` phải là `npm run start` (hoặc `tsx server.ts`), `PORT` do nền tảng gán (ví dụ 8080).
- Biến môi trường: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL` (URL công khai của app).
- (Tuỳ chọn) Nếu frontend và API khác domain: build với `VITE_API_BASE_URL=https://your-api-host` (không có `/` cuối).

Xem thêm `Dockerfile` để deploy container đúng một process.
