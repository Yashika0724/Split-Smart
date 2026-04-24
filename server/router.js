function compile(pattern) {
  const keys = [];
  const regex = new RegExp(
    '^' +
      pattern.replace(/:([a-zA-Z_]+)/g, (_, k) => {
        keys.push(k);
        return '([^/]+)';
      }) +
      '/?$'
  );
  return { regex, keys };
}

function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    const { regex, keys } = compile(pattern);
    routes.push({ method, regex, keys, handler });
  }

  function match(method, url) {
    const path = url.split('?')[0];
    for (const route of routes) {
      if (route.method !== method) continue;
      const m = path.match(route.regex);
      if (m) {
        const params = {};
        route.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        return { params, handler: route.handler };
      }
    }
    return null;
  }

  return {
    get: (p, h) => add('GET', p, h),
    post: (p, h) => add('POST', p, h),
    put: (p, h) => add('PUT', p, h),
    del: (p, h) => add('DELETE', p, h),
    match,
  };
}

module.exports = createRouter;
