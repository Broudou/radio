import { getStreamStatus } from '../services/icecastStatusService.js';
import { config } from '../config/env.js';

export async function getStatus(_req, res) {
  const status = await getStreamStatus();
  res.json({
    ...status,
    streamUrl: `${config.stationPublicUrl.replace(/\/$/, '')}${config.icecastMount}`,
    stationName: config.stationName,
  });
}
