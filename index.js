var denodeify = require('es6-denodeify')(Promise)
var tough = require('tough-cookie')

module.exports = function fetchCookieDecorator (fetch, jar) {
  fetch = fetch || window.fetch
  jar = jar || new tough.CookieJar()

  var getCookieString = denodeify(jar.getCookieString.bind(jar))
  var setCookie = denodeify(jar.setCookie.bind(jar))

  async function fetchCookie (url, opts) {
    opts = opts || {}

    // Prepare request
    const cookie = await getCookieString(typeof url === 'string' ? url : url.url)

    if (url.headers && typeof url.headers.append === 'function') {
      url.headers.append('cookie', cookie)
    } else if (opts.headers && typeof opts.headers.append === 'function') {
      opts.headers.append('cookie', cookie)
    } else {
      opts.headers = Object.assign(
        opts.headers || {},
        cookie ? { cookie: cookie } : {}
      )
    }

    // Actual request
    const res = await fetch(url, opts)

    // Get cookie header
    var cookies = []
    if (res.headers.getAll) {
      // node-fetch v1
      cookies = res.headers.getAll('set-cookie')
      // console.warn("You are using a fetch version that supports 'Headers.getAll' which is deprecated!")
      // console.warn("In the future 'fetch-cookie-v2' may discontinue supporting that fetch implementation.")
      // console.warn('Details: https://developer.mozilla.org/en-US/docs/Web/API/Headers/getAll')
    } else {
      // node-fetch v2
      const headers = res.headers.raw()
      if (headers['set-cookie'] !== undefined) {
        cookies = headers['set-cookie']
      }
    }

    // Store all present cookies
    for(let cookie of cookies) {
      try {
        await setCookie(cookie, res.url)
      } catch(err) {
        console.error(err);
      }
    }

    return res
  }

  return fetchCookie
}
