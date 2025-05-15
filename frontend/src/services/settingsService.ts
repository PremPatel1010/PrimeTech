import axiosInstance from '../utils/axios';

export async function getCompanySettings() {
  const res = await axiosInstance.get('/company-settings/settings');
  return res.data;
}

export async function updateCompanySettings(settings) {
  const res = await axiosInstance.put('/company-settings/settings', settings);
  return res.data;
} 