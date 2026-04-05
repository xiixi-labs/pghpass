const DEV_MODE = process.env.DEV_MODE === 'true';

// ── In-memory Redis mock for DEV_MODE ─────────────────────────────────
const store = new Map<string, string>();
const lists = new Map<string, string[]>();
const ttls = new Map<string, NodeJS.Timeout>();

function setTTL(key: string, seconds: number) {
  clearTTL(key);
  ttls.set(
    key,
    setTimeout(() => {
      store.delete(key);
      lists.delete(key);
      ttls.delete(key);
    }, seconds * 1000),
  );
}

function clearTTL(key: string) {
  const timer = ttls.get(key);
  if (timer) {
    clearTimeout(timer);
    ttls.delete(key);
  }
}

const memRedis = {
  // String commands
  get: async (key: string) => store.get(key) ?? null,

  set: async (key: string, value: string, ...args: any[]) => {
    store.set(key, value);
    // Handle SET key value EX seconds
    const exIdx = args.indexOf('EX');
    if (exIdx !== -1 && args[exIdx + 1] != null) {
      setTTL(key, Number(args[exIdx + 1]));
    }
    // Handle SET key value EX seconds NX
    const nxIdx = args.indexOf('NX');
    if (nxIdx !== -1) {
      // NX: only set if not exists
      if (store.has(key) && store.get(key) !== value) {
        // Key already existed with different value — NX should fail
        // But we already set it above, so we need to check before setting
        // Re-implement properly:
      }
    }
    return 'OK';
  },

  del: async (key: string) => {
    clearTTL(key);
    const existed = store.has(key) ? 1 : 0;
    store.delete(key);
    return existed;
  },

  incr: async (key: string) => {
    const val = Number(store.get(key) || '0') + 1;
    store.set(key, String(val));
    return val;
  },

  expire: async (key: string, seconds: number) => {
    if (store.has(key) || lists.has(key)) {
      setTTL(key, seconds);
      return 1;
    }
    return 0;
  },

  // List commands
  lpush: async (key: string, ...values: string[]) => {
    if (!lists.has(key)) lists.set(key, []);
    const list = lists.get(key)!;
    list.unshift(...values);
    return list.length;
  },

  lrange: async (key: string, start: number, stop: number) => {
    const list = lists.get(key) ?? [];
    const end = stop === -1 ? list.length : stop + 1;
    return list.slice(start, end);
  },

  lrem: async (key: string, count: number, value: string) => {
    const list = lists.get(key);
    if (!list) return 0;
    const idx = list.indexOf(value);
    if (idx !== -1) {
      list.splice(idx, 1);
      return 1;
    }
    return 0;
  },

  // Connection
  connect: async () => {
    console.log('[DEV_MODE] In-memory Redis ready');
  },

  on: (_event: string, _handler: (...args: any[]) => void) => {
    // No-op in dev mode
  },

  status: 'ready',
};

// Fix SET with NX — re-implement properly
memRedis.set = async (key: string, value: string, ...args: any[]): Promise<string> => {
  const nxIdx = args.indexOf('NX');
  if (nxIdx !== -1 && store.has(key)) {
    return 'NULL'; // NX failed — key already exists
  }

  store.set(key, value);

  const exIdx = args.indexOf('EX');
  if (exIdx !== -1 && args[exIdx + 1] != null) {
    setTTL(key, Number(args[exIdx + 1]));
  }

  return 'OK';
};

// ── Production Redis client ───────────────────────────────────────────
let redis: any;

if (DEV_MODE) {
  redis = memRedis;
} else {
  const Redis = (await import('ioredis')).default;
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redis.on('error', (err: Error) => {
    console.error('Redis connection error:', err.message);
  });

  redis.on('connect', () => {
    console.log('Redis connected');
  });
}

export { redis };
