import { getSystemStatus } from '../services/systemStatusService.js';

export async function getStatus(_req, res) {
  const status = await getSystemStatus();
  res.json(status);
}
