export function getBusinessInitials(businessName) {
  if (!businessName || typeof businessName !== 'string') {
    return 'V';
  }
  
  const words = businessName.trim().split(' ').filter(word => word.length > 0);
  
  if (words.length === 0) {
    return 'V';
  }
  
  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }
  
  return (words[0][0] + words[1][0]).toUpperCase();
}