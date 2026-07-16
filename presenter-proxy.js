(() => {
  if (window.presenterApi) return;

  let _id = 0;
  const pending = new Map();

  window.addEventListener('message', (e) => {
    const data = e.data;
    if (!data || typeof data !== 'object') return;
    if (data.type !== 'presenterApiResponse') return;
    const cb = pending.get(data.requestId);
    if (!cb) return;
    pending.delete(data.requestId);
    cb(data);
  });

  function call(method, ...args) {
    return new Promise((resolve, reject) => {
      const requestId = ++_id;
      pending.set(requestId, (resp) => {
        if (resp.error) reject(new Error(resp.error));
        else resolve(resp.result);
      });
      parent.postMessage({ type: 'presenterApiRequest', requestId, method, args }, '*');
      setTimeout(() => {
        if (pending.has(requestId)) {
          pending.delete(requestId);
          reject(new Error('presenterApi timeout'));
        }
      }, 5000);
    });
  }

  window.presenterApi = {
    getDisplays: () => call('get-displays'),
    setPresenterDisplay: (id) => call('set-presenter-display', id),
    getHymns: () => call('get-hymns'),
    saveHymns: (hymns) => call('save-hymns', hymns),
  };
})();
