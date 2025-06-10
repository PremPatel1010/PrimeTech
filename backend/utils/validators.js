export const validateBatchData = (data) => {
  if (!data.product_id) {
    return 'Product ID is required';
  }

  if (!data.quantity || data.quantity <= 0) {
    return 'Valid quantity is required';
  }



  // Validate due date is in the future
  const dueDate = new Date(data.due_date);
  const today = new Date();
  if (dueDate < today) {
    return 'Due date must be in the future';
  }

  return null;
};

export const validateStatusUpdate = (status) => {
  if (!status) {
    return 'Status is required';
  }

  const validStatuses = ['pending', 'in_progress', 'completed', 'skipped'];
  if (!validStatuses.includes(status)) {
    return `Status must be one of: ${validStatuses.join(', ')}`;
  }

  return null;
}; 