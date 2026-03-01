const fs = require('fs')
const path = require('path')
const archiver = require('archiver')
const builder = require('electron-builder')
const Arch = builder.Arch

const packageFile = require('./../package.json')
const version = packageFile.version
const productName = packageFile.productName || 'Ouro'

const createPackage = require('./createPackage.js')

async function afterPackageBuilt(packagePath) {
  /* create output directory if it doesn't exist */
  if (!fs.existsSync('dist/app')) {
    fs.mkdirSync('dist/app', { recursive: true })
  }

  let archSuffix = ''
  let archName = 'x64'

  if (packagePath.includes('ia32')) {
    archSuffix = '-ia32'
    archName = 'ia32'
  } else if (packagePath.includes('arm64')) {
    archSuffix = '-arm64'
    archName = 'arm64'
  }

  console.log(`\n--- Processing ${archName} Build ---`)
  console.log(`Source: ${packagePath}`)

  /* 1. Create Zip File */
  const zipName = `${productName}-v${version}-windows${archSuffix}.zip`
  const zipOutput = fs.createWriteStream(path.join('dist/app', zipName))
  const archive = archiver('zip', { zlib: { level: 9 } })

  archive.directory(packagePath, `${productName}-v${version}`)
  archive.pipe(zipOutput)
  await archive.finalize()
  console.log(`✅ Zip Created: dist/app/${zipName}`)

  /* 2. Create Windows Installer (.exe) */
  const installer = require('electron-installer-windows')

  const options = {
    src: packagePath,
    dest: 'dist/app/installer' + archSuffix,
    icon: 'icons/icon256.ico',
    authors: ['Pavan Tej Munagala'],
    description: 'Ouro Browser',
    exe: productName + '.exe',
    noMsi: true,
    setupExe: `${productName}-v${version}-setup${archSuffix}.exe`
  }

  console.log('Creating Windows Installer (this may take a minute)...')

  // Copy License if it exists
  if (fs.existsSync('LICENSE.txt')) {
    fs.copyFileSync('LICENSE.txt', path.join(packagePath, 'LICENSE'))
  }

  try {
    await installer(options)

    // Move the installer to the main dist/app folder for easy access
    const generatedInstallerPath = path.join(options.dest, options.setupExe)
    const finalPath = path.join('dist/app', options.setupExe)

    if (fs.existsSync(generatedInstallerPath)) {
      fs.renameSync(generatedInstallerPath, finalPath)
      console.log(`🚀 SUCCESS: Installer created at ${finalPath}`)
    }
  } catch (err) {
    console.error('❌ Installer creation failed:', err.message)
    throw err
  }
}

/* Main Build Execution */
async function runBuilds() {
  try {
    console.log("Starting Ouro Windows Build Process...")

    // Remove old dist folder to start fresh
    if (fs.existsSync('dist/app')) {
      console.log("Cleaning old build files...")
    }

    // Build x64 (Standard Windows 10/11)
    const x64Path = await createPackage('win32', { arch: Arch.x64 })
    await afterPackageBuilt(x64Path)

    console.log("\n✨ ALL DONE! Check your dist/app folder for the .exe file.")
  } catch (err) {
    console.error("\n💥 Build Process Failed:", err)
    process.exit(1)
  }
}

runBuilds()