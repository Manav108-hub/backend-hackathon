export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

export const getDateRange = (days: number): { start: string; end: string } => {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  
  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
};

export const validateLatLng = (lat: number, lng: number): boolean => {
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
};