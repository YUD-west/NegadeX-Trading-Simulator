import axios from 'axios';

const baseURL = (import.meta.env.VITE_API_URL || '') + '/api';

export const api = axios.create({
  baseURL,
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('negadex:token') || localStorage.getItem('pulse:token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname;
      if (!['/', '/login', '/register'].includes(path)) {
        localStorage.removeItem('negadex:token');
        localStorage.removeItem('pulse:token');
      }
    }
    return Promise.reject(err);
  },
);

export const auth = {
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  login:    (data) => api.post('/auth/login',    data).then(r => r.data),
  me:       ()     => api.get ('/auth/me').then(r => r.data),
  update:   (data) => api.put ('/auth/me', data).then(r => r.data),
};

export const stocks = {
  list:     (params) => api.get('/stocks', { params }).then(r => r.data),
  detail:   (s)      => api.get(`/stocks/${s}`).then(r => r.data),
  history:  (s, p)   => api.get(`/stocks/${s}/history`, { params: p }).then(r => r.data),
  trending: ()       => api.get('/stocks/trending').then(r => r.data),
  news:     ()       => api.get('/stocks/news').then(r => r.data),
  sectors:  ()       => api.get('/stocks/sectors').then(r => r.data),
  summary:  ()       => api.get('/stocks/summary').then(r => r.data),
  lookup:   (s, t)   => api.get(`/stocks/${s}/lookup`, { params: { time: t } }).then(r => r.data),
};

export const trade = {
  place:        (data)    => api.post('/trade/order', data).then(r => r.data),
  cancel:       (engineId)=> api.delete(`/trade/order/${engineId}`).then(r => r.data),
  undo:         ()        => api.post('/trade/undo').then(r => r.data),
  orderbook:    (s)       => api.get(`/trade/orderbook/${s}`).then(r => r.data),
  recent:       ()        => api.get('/trade/recent').then(r => r.data),
};

export const portfolio = {
  me:           () => api.get('/portfolio/me').then(r => r.data),
  transactions: () => api.get('/portfolio/transactions').then(r => r.data),
  exportCsv:    () => api.get('/portfolio/export', { responseType: 'blob' }).then(r => r.data),
};

export const watchlist = {
  list:        ()         => api.get('/watchlist').then(r => r.data),
  add:         (s)        => api.post(`/watchlist/${s}`).then(r => r.data),
  remove:      (s)        => api.delete(`/watchlist/${s}`).then(r => r.data),
  addAlert:    (data)     => api.post('/watchlist/alerts', data).then(r => r.data),
  removeAlert: (idx)      => api.delete(`/watchlist/alerts/${idx}`).then(r => r.data),
};

export const leaderboard = {
  list: () => api.get('/leaderboard').then(r => r.data),
};

export const insights = {
  recos:        () => api.get('/insights/recommendations').then(r => r.data),
  heatmap:      () => api.get('/insights/heatmap').then(r => r.data),
  equity:       () => api.get('/insights/equity').then(r => r.data),
  risk:         () => api.get('/insights/risk').then(r => r.data),
  achievements: () => api.get('/insights/achievements').then(r => r.data),
};

export const admin = {
  stats:        ()              => api.get('/admin/stats').then(r => r.data),
  users:        ()              => api.get('/admin/users').then(r => r.data),
  suspend:      (id, suspended) => api.put(`/admin/users/${id}/suspend`, { suspended }).then(r => r.data),
  shock:        (data)          => api.post('/admin/shock', data).then(r => r.data),
  setRegime:    (regime)        => api.post('/admin/regime', { regime }).then(r => r.data),
  replay:       (sequence)      => api.post('/admin/replay', { sequence }).then(r => r.data),
  updateStock:  (s, patch)      => api.put(`/admin/stocks/${s}`, patch).then(r => r.data),
};

export const pro = {
  challenges:     () => api.get('/pro/challenges').then(r => r.data),
  optionQuote:    (params) => api.get('/pro/options/quote', { params }).then(r => r.data),
  advancedOrders: () => api.get('/pro/advanced-orders').then(r => r.data),
  createAdvancedOrder: (data) => api.post('/pro/advanced-orders', data).then(r => r.data),
  social:         () => api.get('/pro/social').then(r => r.data),
  createPost:     (data) => api.post('/pro/social', data).then(r => r.data),
  likePost:       (id) => api.post(`/pro/social/${id}/like`).then(r => r.data),
  backtest:       (params) => api.get('/pro/backtest', { params }).then(r => r.data),
  analytics:      () => api.get('/pro/analytics').then(r => r.data),
  sentiment:      () => api.get('/pro/sentiment').then(r => r.data),
};

export const ai = {
  chat:        (message, history) => api.post('/ai/chat', { message, history }).then(r => r.data),
  suggestions: ()                 => api.get('/ai/suggestions').then(r => r.data),
};
