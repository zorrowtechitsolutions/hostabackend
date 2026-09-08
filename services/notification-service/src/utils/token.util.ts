import axios from 'axios';

export const getTokensIfEnabled = async (role: string, id: number, tokenFieldName: string): Promise<string[]> => {
  if (!id || !role) return [];
  try {
    const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://auth-service:3020';
    const response = await axios.get(`${authServiceUrl}/auth/${id}/role/${role}`);
    const data = response.data?.data;
    
    // Check if notifications are disabled
    if (data && data.notificationEnabled === false) {
      return [];
    }
    
    // Return tokens if available
    if (data && data[tokenFieldName] && Array.isArray(data[tokenFieldName])) {
      return data[tokenFieldName].map((d: any) => d.fcmToken).filter(Boolean);
    }
    return [];
  } catch (error: any) {
    console.error(`Failed to fetch ${role} ${id} for tokens:`, error.message);
    return [];
  }
};
