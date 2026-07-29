export const getCurrencySymbol = (currencyCode) => {
  // Force Indian Rupee symbol globally
  return '₹';
};

export const formatAmount = (amount, currencyCode = 'INR') => {
  const value = parseFloat(amount);
  if (isNaN(value)) return '₹0';
  
  // Format numbers using the Indian numbering system (en-IN) without decimal fractions
  const formatted = value.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
  
  return `₹${formatted}`;
};
