import { Category } from './types';

export const CATEGORIES: Category[] = [
  // Thu
  { id: 'luong', name: 'Lương', icon: '💰', type: 'thu' },
  { id: 'freelance', name: 'Freelance', icon: '💻', type: 'thu' },
  { id: 'thuong', name: 'Thưởng', icon: '🎁', type: 'thu' },
  { id: 'ads', name: 'ADS', icon: '📈', type: 'thu' },
  { id: 'thu-khac', name: 'Thu khác', icon: '➕', type: 'thu' },
  
  // Chi
  { id: 'an-uong', name: 'Ăn uống', icon: '🍔', type: 'chi' },
  { id: 'di-lai', name: 'Đi lại', icon: '🏍️', type: 'chi' },
  { id: 'mua-sam', name: 'Mua sắm', icon: '🛍️', type: 'chi' },
  { id: 'giai-tri', name: 'Giải trí', icon: '🎮', type: 'chi' },
  { id: 'sinh-hoat', name: 'Sinh hoạt', icon: '🏠', type: 'chi' },
  { id: 'suc-khoe', name: 'Sức khỏe', icon: '🏥', type: 'chi' },
  { id: 'business', name: 'Business', icon: '💼', type: 'chi' },
  { id: 'hoc-tap', name: 'Học tập', icon: '📚', type: 'chi' },
  { id: 'sach', name: 'Sách', icon: '📖', type: 'chi' },
  { id: 'cafe', name: 'Cafe', icon: '☕', type: 'chi' },
  { id: 'qua-tang', name: 'Quà tặng', icon: '💝', type: 'chi' },
  
  // Thanh toan
  { id: 'tien-nha', name: 'Tiền nhà', icon: '🏘️', type: 'thanhtoan' },
  { id: 'tra-gop', name: 'Trả góp', icon: '💳', type: 'thanhtoan' },
  { id: 'the-tin-dung', name: 'Thẻ tín dụng', icon: '💳', type: 'thanhtoan' },
  { id: 'subscription', name: 'Đăng ký (Netflix/Spotify)', icon: '📺', type: 'thanhtoan' },
  { id: 'khoan-vay', name: 'Khoản vay', icon: '💸', type: 'no' },
  { id: 'no-khac', name: 'Nợ khác', icon: '📝', type: 'no' },
  
  // Hoa don (Variable bills)
  { id: 'momo-paylater', name: 'Momo Pay Later', icon: '💳', type: 'hoadon' },
  { id: 'shopee-paylater', name: 'Shopee Pay Later', icon: '🛍️', type: 'hoadon' },
  { id: 'dien', name: 'Tiền điện', icon: '⚡', type: 'hoadon' },
  { id: 'nuoc', name: 'Tiền nước', icon: '💧', type: 'hoadon' },
  { id: 'dien-thoai', name: 'Điện thoại', icon: '📱', type: 'hoadon' },
  { id: 'hoadon-khac', name: 'Hóa đơn khác', icon: '🧾', type: 'hoadon' },
];

export const COLORS = {
  thanhtoan: '#f59e0b', // Amber 500 (Orange for Bills)
  chi: '#64748b', // Slate 500 (Neutral for Expenses)
  no: '#ef4444', // Red 500 (Red for Debt/Risk)
  thu: '#10b981', // Emerald 500
  hoadon: '#8b5cf6', // Violet 500 (For variable bills)
  bg: '#f8fafc', // Slate 50
  card: '#ffffff',
  text: '#1e293b', // Slate 800
  muted: '#64748b', // Slate 500
};
