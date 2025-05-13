// Manufacturing batch API service

import axiosInstance from "@/utils/axios";

export async function fetchBatches() {
  const res = await axiosInstance.get('/manufacturing-progress/batches');
  return res.data;
}

export async function createBatch(batch: any) {
  const res = await axiosInstance.post('/manufacturing-progress/batches', batch);
  return res.data;
}

export async function updateBatchStage(trackingId: string, update: any) {
  const res = await axiosInstance.patch(`/manufacturing-progress/batches/${trackingId}/stage`, update);
  return res.data;
}

export async function editBatch(trackingId: string, update: any) {
  const res = await axiosInstance.patch(`/manufacturing-progress/batches/${trackingId}`, update);
  return res.data;
}

export async function deleteBatch(trackingId: string) {
  const res = await axiosInstance.delete(`/manufacturing-progress/batches/${trackingId}`);
  return res.data;
}

export async function completeManufacturing(orderId: string, orderItemId: string) {
  const res = await axiosInstance.put(`/manufacturing-progress/order/${orderId}/item/${orderItemId}/complete`);
  return res.data;
} 