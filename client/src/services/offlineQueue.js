// Client-side offline action queue for shop floor resilience

const QUEUE_KEY = 'autoserv_offline_queue';

export const getOfflineQueue = () => {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Error reading offline queue:', e);
    return [];
  }
};

export const enqueueOfflineAction = (type, payload) => {
  const queue = getOfflineQueue();
  const item = {
    id: Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    type, // 'PROGRESS_NOTE' | 'CHECKLIST_UPDATE' | 'PHOTO_CAPTURE'
    payload,
    timestamp: new Date().toISOString()
  };
  queue.push(item);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
};

export const clearOfflineQueue = () => {
  localStorage.removeItem(QUEUE_KEY);
};

export const processOfflineQueue = async (api) => {
  const queue = getOfflineQueue();
  if (queue.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      if (item.type === 'PROGRESS_NOTE') {
        await api.addProgressMedia(item.payload.jobCardId, item.payload.url || '', item.payload.caption);
      } else if (item.type === 'CHECKLIST_UPDATE') {
        await api.recordInspection(item.payload.jobCardId, item.payload.mediaPayload || []);
      } else if (item.type === 'PHOTO_CAPTURE') {
        await api.addProgressMedia(item.payload.jobCardId, item.payload.url, item.payload.caption);
      }
      processed++;
    } catch (err) {
      console.error(`Failed to process queued action ${item.id}:`, err);
      failed++;
      remaining.push(item);
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  return { processed, failed };
};
