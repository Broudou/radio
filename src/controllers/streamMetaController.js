import { getStreamMetadata } from '../services/icecastStatusService.js';
import { config } from '../config/env.js';

export async function getStreamMeta(_req, res) {
  const metadata = await getStreamMetadata();
  res.json({
    ...metadata,
    streamUrl: `${config.stationPublicUrl.replace(/\/$/, '')}${config.icecastMount}`,
  });
}
