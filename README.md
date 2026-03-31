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
2. Copy [.env.example](.env.example) → `.env.local` và điền biến (xem dưới).
3. Run the app (Express + Vite, có `/api/*`):
   `npm run dev`

### Google Sheet — đồng bộ

- Tạo **Service Account** trên Google Cloud, tải JSON key (hoặc dán toàn bộ JSON vào biến `GOOGLE_SERVICE_ACCOUNT_JSON` trên server).
- Trong Google Sheet: **Chia sẻ** bảng Moni Flow với email dạng `...@....iam.gserviceaccount.com` — quyền **Người chỉnh sửa**.
- App tự gọi `POST /api/sync-sheets` sau khi dữ liệu đổi (debounce); không cần đăng nhập Google trong trình duyệt.
- Tuỳ chọn: `GOOGLE_SPREADSHEET_ID` để trỏ bảng khác (mặc định là bảng Moni Flow trong code).
- FE deploy tách domain (Vercel): đặt `VITE_API_BASE_URL` = URL backend.

### Build & production

- **Không** `vite preview` một mình — không có backend. Sau build: `npm start` hoặc `npm run preview` (chạy `tsx server.ts` + `dist`).
- Cloud Run / Docker: `CMD` là `npm start` (hoặc `tsx server.ts`), `PORT` do nền tảng gán.

Xem `Dockerfile` để deploy container.
