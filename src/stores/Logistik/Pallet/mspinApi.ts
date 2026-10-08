// utils/mspinApi.ts
import axios from 'axios';

// Instance axios khusus untuk mspin, tanpa interceptor global
const mspinApi = axios.create({
  baseURL: 'https://mspin.newarmada.biz',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
});

export default mspinApi;