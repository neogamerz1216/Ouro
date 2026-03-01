var regedit = require('regedit')

var installPath = process.execPath

var keysToCreate = [
  'HKCU\\Software\\Classes\\Ouro',
  'HKCU\\Software\\Classes\\Ouro\\Application',
  'HKCU\\Software\\Classes\\Ouro\\DefaulIcon',
  'HKCU\\Software\\Classes\\Ouro\\shell\\open\\command',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities\\FileAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities\\StartMenu',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities\\URLAssociations',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\DefaultIcon',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\InstallInfo',
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\shell\\open\\command'
]

var registryConfig = {
  'HKCU\\Software\\RegisteredApplications': {
    Ouro: {
      value: 'Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\Ouro': {
    default: {
      value: 'Ouro Browser Document',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\Ouro\\Application': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    },
    ApplicationName: {
      value: 'Ouro',
      type: 'REG_SZ'
    },
    AppUserModelId: {
      value: 'Ouro',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\Ouro\\DefaulIcon': {
    ApplicationIcon: {
      value: installPath + ',0',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\Ouro\\shell\\open\\command': {
    default: {
      value: '"' + installPath + '" "%1"',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Classes\\.htm\\OpenWithProgIds': {
    Ouro: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Classes\\.html\\OpenWithProgIds': {
    Ouro: {
      value: 'Empty',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities\\FileAssociations': {
    '.htm': {
      value: 'Ouro',
      type: 'REG_SZ'
    },
    '.html': {
      value: 'Ouro',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities\\StartMenu': {
    StartMenuInternet: {
      value: 'Ouro',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\Capabilities\\URLAssociations': {
    http: {
      value: 'Ouro',
      type: 'REG_SZ'
    },
    https: {
      value: 'Ouro',
      type: 'REG_SZ'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\DefaultIcon': {
    default: {
      value: installPath + ',0',
      type: 'REG_DEFAULT'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\InstallInfo': {
    IconsVisible: {
      value: 1,
      type: 'REG_DWORD'
    }
  },
  'HKCU\\Software\\Clients\\StartMenuInternet\\Ouro\\shell\\open\\command': {
    default: {
      value: installPath,
      type: 'REG_DEFAULT'
    }
  }
}

var registryInstaller = {
  install: function () {
    return new Promise(function (resolve, reject) {
      regedit.createKey(keysToCreate, function (err) {
        regedit.putValue(registryConfig, function (err) {
          if (err) {
            reject()
          } else {
            resolve()
          }
        })
      })
    })
  },
  uninstall: function () {
    return new Promise(function (resolve, reject) {
      regedit.deleteKey(keysToCreate, function (err) {
        if (err) {
          reject()
        } else {
          resolve()
        }
      })
    })
  }
}
