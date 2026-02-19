const ouroPath = require('path')
const { pathToFileURL } = require('url')
const { protocol: ouroProtocol, net: ouroNet, app: ouroApp, session: ouroSession } = require('electron')

ouroProtocol.registerSchemesAsPrivileged([
  {
    scheme: 'ouro',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true
    }
  }
])

function registerBundleProtocol (ses) {
  ses.protocol.handle('ouro', (req) => {
    let { host, pathname } = new URL(req.url)

    if (pathname.charAt(0) === '/') {
      pathname = pathname.substring(1)
    }

    if (host !== 'app') {
      return new Response('bad', {
        status: 400,
        headers: { 'content-type': 'text/html' }
      })
    }

    // NB, this checks for paths that escape the bundle, e.g.
    // app://bundle/../../secret_file.txt
    const pathToServe = ouroPath.resolve(__dirname, pathname)
    const relativePath = ouroPath.relative(__dirname, pathToServe)
    const isSafe = relativePath && !relativePath.startsWith('..') && !ouroPath.isAbsolute(relativePath)

    if (!isSafe) {
      return new Response('bad', {
        status: 400,
        headers: { 'content-type': 'text/html' }
      })
    }

    return ouroNet.fetch(pathToFileURL(pathToServe).toString())
  })
}

ouroApp.on('session-created', (ses) => {
  if (ses !== ouroSession.defaultSession) {
    registerBundleProtocol(ses)
  }
})
