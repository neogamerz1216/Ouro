const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const { execFileSync } = require('child_process')

const packageFile = require('./../package.json')
const version = packageFile.version

const appName = 'Ouro'
const targetArchitectures = ['x64', 'ia32', 'arm64']
const outputDirectory = path.join('dist', 'app')

function getArchSuffix(arch) {
  return arch === 'x64' ? '' : '-' + arch
}

function runForgePackage(arch) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
  execFileSync(npmCommand, ['run', 'package', '--', '--platform=win32', '--arch=' + arch], {
    stdio: 'inherit'
  })
}

function findPackagePath(arch) {
  const candidateNames = [
    appName + '-win32-' + arch,
    appName.toLowerCase() + '-win32-' + arch
  ]

  for (const candidateName of candidateNames) {
    const candidatePath = path.join('out', candidateName)
    if (fs.existsSync(candidatePath)) {
      return candidatePath
    }
  }

  return null
}

function createPortableArchive(packagePath, archSuffix) {
  return new Promise((resolve, reject) => {
    const zipName = 'Ouro-v' + version + '-windows' + archSuffix + '-portable.zip'
    const zipPath = path.join(outputDirectory, zipName)
    const archiveRoot = 'Ouro-v' + version + '-windows' + archSuffix
    const output = fs.createWriteStream(zipPath)
    const archive = archiver('zip', {
      zlib: { level: 9 }
    })

    output.on('close', resolve)
    output.on('error', reject)
    archive.on('error', reject)

    archive.directory(packagePath, archiveRoot)
    archive.pipe(output)
    archive.finalize()
  })
}

async function createInstaller(packagePath, archSuffix) {
  const installer = require('electron-installer-windows')
  const installerOutputDir = path.join(outputDirectory, 'ouro-installer' + archSuffix)
  const setupExeName = 'Ouro-v' + version + '-windows' + archSuffix + '-setup.exe'

  const options = {
    src: packagePath,
    dest: installerOutputDir,
    name: 'ouro',
    title: appName,
    exe: appName + '.exe',
    setupExe: setupExeName,
    description: packageFile.description,
    authors: [packageFile.author || appName],
    icon: path.resolve(__dirname, '../icons/icon256.ico'),
    setupIcon: path.resolve(__dirname, '../icons/icon256.ico'),
    animation: path.resolve(__dirname, '../icons/windows-installer.gif'),
    licenseUrl: 'https://github.com/ouro-browser/ouro/blob/main/LICENSE.txt',
    noMsi: true
  }

  console.log('Creating unsigned installer for win32' + archSuffix)
  await installer(options)
}

async function buildWindowsForArch(arch) {
  const archSuffix = getArchSuffix(arch)

  console.log('Packaging win32 build for', arch)
  runForgePackage(arch)

  const packagePath = findPackagePath(arch)
  if (!packagePath) {
    throw new Error('Packaged app was not found for architecture: ' + arch)
  }

  fs.copyFileSync('LICENSE.txt', path.join(packagePath, 'LICENSE'))

  await createPortableArchive(packagePath, archSuffix)

  try {
    await createInstaller(packagePath, archSuffix)
  } catch (err) {
    console.warn('Installer build failed for win32' + archSuffix + '. Portable package is still available.')
    console.warn(err && err.message ? err.message : err)
  }
}

(async function () {
  fs.mkdirSync(outputDirectory, { recursive: true })

  for (const arch of targetArchitectures) {
    await buildWindowsForArch(arch)
  }
})().catch(err => {
  console.error(err, err.stack)
  process.exit(1)
})
