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

export const validateNotificationFilters = (filters) => {
  const { limit, offset, module, type, status, priority, startDate, endDate } = filters;

  // Validate limit and offset
  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return 'Limit must be a number between 1 and 100';
  }

  if (offset && (isNaN(offset) || offset < 0)) {
    return 'Offset must be a non-negative number';
  }

  // Validate module
  if (module && !['purchase', 'sales', 'manufacturing', 'inventory', 'admin', 'all'].includes(module)) {
    return 'Invalid module specified';
  }

  // Validate type
  if (type && !['purchase_order', 'grn', 'qc', 'manufacturing', 'user_management', 'inventory', 'all'].includes(type)) {
    return 'Invalid notification type specified';
  }

  // Validate status
  if (status && !['read', 'unread', 'all'].includes(status)) {
    return 'Invalid status specified';
  }

  // Validate priority
  if (priority && !['high', 'normal', 'low', 'all'].includes(priority)) {
    return 'Invalid priority specified';
  }

  // Validate dates
  if (startDate && !isValidDate(startDate)) {
    return 'Invalid start date format';
  }

  if (endDate && !isValidDate(endDate)) {
    return 'Invalid end date format';
  }

  if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
    return 'Start date cannot be after end date';
  }

  return null;
};

const isValidDate = (dateString) => {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}; 