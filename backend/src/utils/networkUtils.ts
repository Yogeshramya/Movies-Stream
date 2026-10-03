import os from 'os';

export interface NetworkInterfaceInfo {
  name: string;
  address: string;
  family: string;
  isRecommended: boolean;
}

export function getLocalIPAddresses(): NetworkInterfaceInfo[] {
  const interfaces = os.networkInterfaces();
  const results: NetworkInterfaceInfo[] = [];

  for (const [name, nets] of Object.entries(interfaces)) {
    if (!nets) continue;
    for (const net of nets) {
      // Skip internal (127.0.0.1) and non-IPv4
      if (net.family === 'IPv4' && !net.internal) {
        const isCommonLocal =
          net.address.startsWith('192.168.') ||
          net.address.startsWith('10.') ||
          net.address.startsWith('172.16.');

        results.push({
          name,
          address: net.address,
          family: net.family,
          isRecommended: isCommonLocal,
        });
      }
    }
  }

  // Sort recommended first
  results.sort((a, b) => (b.isRecommended ? 1 : 0) - (a.isRecommended ? 1 : 0));

  return results;
}

export function getPrimaryLocalIP(): string {
  const ips = getLocalIPAddresses();
  return ips.length > 0 ? ips[0].address : '127.0.0.1';
}
