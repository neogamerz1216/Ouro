/* imports common modules */

var electron = require('electron')
var ipc = electron.ipcRenderer

var propertiesToClone = ['deltaX', 'deltaY', 'metaKey', 'ctrlKey', 'defaultPrevented', 'clientX', 'clientY']

function cloneEvent (e) {
  var obj = {}

  for (var i = 0; i < propertiesToClone.length; i++) {
    obj[propertiesToClone[i]] = e[propertiesToClone[i]]
  }
  return JSON.stringify(obj)
}

// workaround for Electron bug
setTimeout(function () {
  /* Used for swipe gestures */
  window.addEventListener('wheel', function (e) {
    ipc.send('wheel-event', cloneEvent(e))
  })

  var scrollTimeout = null

  window.addEventListener('scroll', function () {
    clearTimeout(scrollTimeout)
    scrollTimeout = setTimeout(function () {
      ipc.send('scroll-position-change', Math.round(window.scrollY))
    }, 200)
  })
}, 0)

/* Used for picture in picture item in context menu */
ipc.on('getContextMenuData', function (event, data) {
  // check for video element to show picture-in-picture menu
  var hasVideo = Array.from(document.elementsFromPoint(data.x, data.y)).some(el => el.tagName === 'VIDEO')
  ipc.send('contextMenuData', { hasVideo })
})

ipc.on('enterPictureInPicture', function (event, data) {
  var videos = Array.from(document.elementsFromPoint(data.x, data.y)).filter(el => el.tagName === 'VIDEO')
  if (videos[0]) {
    videos[0].requestPictureInPicture()
  }
})

window.addEventListener('message', function (e) {
  if (!e.origin.startsWith('ouro://')) {
    return
  }

  if (e.data?.message === 'showCredentialList') {
    ipc.send('showCredentialList')
  }

  if (e.data?.message === 'showUserscriptDirectory') {
    ipc.send('showUserscriptDirectory')
  }

  if (e.data?.message === 'downloadFile') {
    ipc.send('downloadFile', e.data.url)
  }
})
;
/* send bookmarks data.  */

function isVisible (el) {
  // https://github.com/jquery/jquery/blob/305f193aa57014dc7d8fa0739a3fefd47166cd44/src/css/hiddenVisibleSelectors.js
  return el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)
}

function extractPageText (doc, win) {
  var maybeNodes = [].slice.call(doc.body.childNodes)
  var textNodes = []

  var ignore = 'link, style, script, noscript, .hidden, .visually-hidden, .visuallyhidden, [role=presentation], [hidden], [style*="display:none"], [style*="display: none"], .ad, .dialog, .modal, select, svg, details:not([open]), header, nav, footer'

  while (maybeNodes.length) {
    var node = maybeNodes.shift()

    // if the node should be ignored, skip it and all of it's child nodes
    if (node.matches && node.matches(ignore)) {
      continue
    }

    // if the node is a text node, add it to the list of text nodes

    if (node.nodeType === 3) {
      textNodes.push(node)
      continue
    }

    if (!isVisible(node)) {
      continue
    }

    // otherwise, add the node's text nodes to the list of text, and the other child nodes to the list of nodes to check
    var childNodes = node.childNodes
    var cnl = childNodes.length

    for (var i = cnl - 1; i >= 0; i--) {
      var childNode = childNodes[i]
      maybeNodes.unshift(childNode)
    }
  }

  var text = ''

  var tnl = textNodes.length

  // combine the text of all of the accepted text nodes together
  for (var i = 0; i < tnl; i++) {
    text += textNodes[i].textContent + ' '
  }

  // special meta tags

  var mt = doc.head.querySelector('meta[name=description]')

  if (mt) {
    text += ' ' + mt.content
  }

  text = text.trim()

  text = text.replace(/[\n\t]/g, ' ') // remove useless newlines/tabs that increase filesize

  text = text.replace(/\s{2,}/g, ' ') // collapse multiple spaces into one
  return text
}

function getPageData (cb) {
  requestAnimationFrame(function () {
    var text = extractPageText(document, window)

    // try to also extract text for same-origin iframes (such as the reader mode frame)

    var frames = document.querySelectorAll('iframe')

    for (var x = 0; x < frames.length; x++) {
      try {
        text += '. ' + extractPageText(frames[x].contentDocument, frames[x].contentWindow)
      } catch (e) {}
    }

    // limit the amount of text that is collected

    text = text.substring(0, 300000)

    cb({
      extractedText: text
    })
  })
}

// send the data when the page loads
if (process.isMainFrame) {
  window.addEventListener('load', function (e) {
    setTimeout(function () {
      getPageData(function (data) {
        ipc.send('pageData', data)
      })
    }, 500)
  })

  setTimeout(function () {
    // https://stackoverflow.com/a/52809105
    electron.webFrame.executeJavaScript(`
      history.pushState = ( f => function pushState(){
        var ret = f.apply(this, arguments);
        window.postMessage('_minInternalLocationChange', '*')
        return ret;
    })(history.pushState);
    
    history.replaceState = ( f => function replaceState(){
        var ret = f.apply(this, arguments);
        window.postMessage('_minInternalLocationReplacement', '*')
        return ret;
    })(history.replaceState);
  `)
  }, 0)

  window.addEventListener('message', function (e) {
    if (e.data === '_minInternalLocationChange') {
      setTimeout(function () {
        getPageData(function (data) {
          ipc.send('pageData', data)
        })
      }, 500)
    }
  })
}
;
/* detects if a page is readerable, and tells the main process if it is */

function pageIsReaderable () {
  var paragraphMap = new Map()

  var paragraphs = document.querySelectorAll('p')
  var totalLength = 0

  if (!paragraphs) {
    return false
  }

  for (var i = 0; i < paragraphs.length; i++) {
    var pLength = Math.max(paragraphs[i].textContent.replace(/\s+/g, ' ').length - 100, -30)
    totalLength += pLength

    var prev = paragraphMap.get(paragraphs[i].parentNode) || 0
    paragraphMap.set(paragraphs[i].parentNode, prev + pLength)
  }

  var largestValue = 0

  paragraphMap.forEach(function (value, key) {
    if (value > largestValue) {
      largestValue = value
    }
  })

  if ((largestValue > 600 && largestValue / totalLength > 0.33) || (largestValue > 400 && document.querySelector('article, meta[property="og:type"][content="article"]'))) {
    return true
  } else {
    return false
  }
}

function checkReaderStatus () {
  if (pageIsReaderable()) {
    ipc.send('canReader')
  }
}

if (process.isMainFrame) {
  // unlike DOMContentLoaded, readystatechange doesn't wait for <script defer>, so it happens a bit sooner
  document.addEventListener('readystatechange', function () {
    if (document.readyState === 'interactive') {
      checkReaderStatus()
    }
  })
  window.addEventListener('load', checkReaderStatus)
}
;
var scriptsToRun = []

/* a collection of various hacks to unbreak sites, mainly due to missing window.open() support */

/* all sites - re-implements window.close, since the built-in function doesn't work correctly */

window.addEventListener('message', function (e) {
  if (e.data === 'close-window') {
    ipc.send('close-window')
  }
})

if (process.isMainFrame) {
  // window.close() isn't implemented in electron by default
  // only enable for main frame, so that calling window.close() from an iframe doesn't close the entire tab
  scriptsToRun.push(`
  window.close = function () {
    postMessage('close-window', '*')
  }
`)
}

if ((window.location.hostname === 'google.com' || window.location.hostname.endsWith('.google.com')) && window.location.hostname !== 'hangouts.google.com' && window.location.hostname !== 'drive.google.com') {
  /* define window.chrome
     this is necessary because some websites (such as the Google Drive file viewer, see issue #378) check for a
     Chrome user agent, and then do things like if(chrome.<module>) {}
     so we need to create a chrome object to prevent errors
     (https://github.com/electron/electron/issues/16587)

     However, if window.chrome exists, hangouts will attempt to connect to an extension and break
     (https://github.com/neogamerz1216/Ouro/issues/1051)
     so don't enable it there

     As of 2/7/22, this also breaks drive, so disable it there also
     */

  scriptsToRun.push(`
    window.chrome = {
      runtime: {
        connect: () => {
          return {
            onMessage: {
              addListener: () => {console.warn('chrome.runtime is not implemented')},
              removeListener: () => {console.warn('chrome.runtime is not implemented')},
            },
            postMessage: () => {console.warn('chrome.runtime is not implemented')},
            disconnect: () => {console.warn('chrome.runtime is not implemented')},
          }
        }
      }
    }
  `)
}

/* drive.google.com - fixes clicking on files to open them */

if (window.location.hostname === 'drive.google.com') {
  scriptsToRun.push(`
    var realWindowOpen = window.open

    window.open = function (url) {
      if (url) {
        return realWindowOpen(url)
      }
      return {
        document: new Proxy({}, {
          get: function () {
            return function () {
              return document.createElement('div')
            }
          },
          set: function () {
            console.warn('unpatched set', arguments)}
        }
        ),
        location: {
          replace: function (location) {
            realWindowOpen(location)
          }
        }
      }
    }
  `)
}

/* news.google.com - fixes clicking on news articles */

if (window.location.hostname === 'news.google.com') {
  scriptsToRun.push(`
    window.open = null
  `)
}

/* calendar.google.com - fixes clicking on URLs in event descriptions */
if (window.location.hostname === 'calendar.google.com') {
  scriptsToRun.push(`
    window.open = null
  `)
}

/* meet.google.com - fix permission prompt for microphone and camera not appearing */
if (window.location.hostname === 'meet.google.com') {
  scriptsToRun.push(`
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
  `)
}

if (scriptsToRun.length > 0) {
  setTimeout(function () {
    electron.webFrame.executeJavaScript(scriptsToRun.join(';'))
  }, 0)
};
window.addEventListener('message', function (e) {
  if (!e.origin.startsWith('ouro://')) {
    return
  }

  if (e.data && e.data.message && e.data.message === 'getSettingsData') {
    ipc.send('getSettingsData')
  }

  if (e.data && e.data.message && e.data.message === 'setSetting') {
    ipc.send('setSetting', { key: e.data.key, value: e.data.value })
  }
})

ipc.on('receiveSettingsData', function (e, data) {
  if (window.location.toString().startsWith('ouro://')) { // probably redundant, but might as well check
    window.postMessage({ message: 'receiveSettingsData', settings: data }, window.location.toString())
  }
})
;
/**
Simple username/password field detector and auto-filler.

When page is loaded, we try to find any input fields with specific name
attributes. If we find something useful, we dispatch an IPC event
'password-autofill' to signal that we want to check if there is auto-fill data
available.

When we receive back an IPC event 'password-autofill-match' with auto-fill
data, we do one of two things:

- If there's a single credentials match, we fill the input fields with that
  data.

- If there's more than one match, we add a focus event listener on the
  username/email fields that will display a small overlay div with available
  options. When user selects one of the options, we fill the input fields with
  credentials data from the selection.

This code doesn't work with JS-based forms. We don't listen to all DOM changes,
we expect the login form to be present in the HTML code at page load. We can
add a MutationObserver to the document, or DOMNodeInserted listener, but I
wanted to keep it lightweight and not impact browser performace too much.
*/

// "carbon:password"

const getKeyIcon = () => {
  const keyIcon = '<svg width="22px" height="22px" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" aria-hidden="true" focusable="false" width="1em" height="1em" style="vertical-align: -0.125em;-ms-transform: rotate(360deg); -webkit-transform: rotate(360deg); transform: rotate(360deg);" preserveAspectRatio="xMidYMid meet" viewBox="0 0 32 32"><path d="M21 2a9 9 0 0 0-9 9a8.87 8.87 0 0 0 .39 2.61L2 24v6h6l10.39-10.39A9 9 0 0 0 30 11.74a8.77 8.77 0 0 0-1.65-6A9 9 0 0 0 21 2zm0 16a7 7 0 0 1-2-.3l-1.15-.35l-.85.85l-3.18 3.18L12.41 20L11 21.41l1.38 1.38l-1.59 1.59L9.41 23L8 24.41l1.38 1.38L7.17 28H4v-3.17L13.8 15l.85-.85l-.29-.95a7.14 7.14 0 0 1 3.4-8.44a7 7 0 0 1 10.24 6a6.69 6.69 0 0 1-1.09 4A7 7 0 0 1 21 18z" fill="currentColor"/><circle cx="22" cy="10" r="2" fill="currentColor"/></svg>'

  const keyIconPolicy = trustedTypes.createPolicy('minAutofillTrustedKeyIcon', {
    createHTML: (string) => string
  })

  return keyIconPolicy.createHTML(keyIcon)
}

const keyIcon = getKeyIcon()

// Ref to added unlock button.
var currentUnlockButton = null
var currentAutocompleteList = null

// Creates an unlock button element.
//
// - input: Input element to 'attach' unlock button to.
function createUnlockButton (input) {
  var inputRect = input.getBoundingClientRect()

  // Container.
  var unlockDiv = document.createElement('div')

  // Style.
  unlockDiv.style.width = '20px'
  unlockDiv.style.height = '20px'
  unlockDiv.style.zIndex = 999999999999999

  // Position.
  unlockDiv.style.position = 'absolute'
  unlockDiv.style.left = (window.scrollX + (inputRect.left + inputRect.width - 20 - 10)) + 'px'
  unlockDiv.style.top = (window.scrollY + (inputRect.top + (inputRect.height - 20) / 2.0)) + 'px'

  // Button.
  var button = document.createElement('div')

  // Button style.
  button.style.width = '20px'
  button.style.height = '20px'
  button.style.opacity = 0.7
  button.style.color = window.getComputedStyle(input).color
  button.style.transition = '0.1s color'
  button.innerHTML = keyIcon

  // Button hover.
  button.addEventListener('mouseenter', (event) => {
    button.style.opacity = 1.0
  })
  button.addEventListener('mouseleave', (event) => {
    button.style.opacity = 0.7
  })

  // Click event.
  button.addEventListener('mousedown', (event) => {
    event.preventDefault()
    requestAutofill()
  })

  unlockDiv.appendChild(button)

  return unlockDiv
}

// Tries to find if an element has a specific attribute value that contains at
// least one of the values from 'matches' array.
function checkAttributes (element, attributes, matches) {
  for (const attribute of attributes) {
    const value = element.getAttribute(attribute)
    if (value == null) { continue }
    if (matches.some(match => value.toLowerCase().includes(match))) {
      return true
    }
  }
  return false
}

// Gets all input fields on a page that contain at least one of the provided
// strings in their name attribute.
function getBestInput (names, exclusionNames, types) {
  const allFields = [
    ...(document.querySelectorAll('form input') || []),
    ...(document.querySelectorAll('input') || [])
  ]
  // this list includes duplicates, but we only use the first one we find that matches, so there's no need to dedupe

  for (const field of allFields) {
    // checkAttribute won't work here because type can be a property but not an attribute
    if (!types.includes(field.type)) {
      continue
    }

    // We expect the field to have either 'name', 'formcontrolname' or 'id' attribute
    // that we can use to identify it as a login form input field.
    if (names.length === 0 || checkAttributes(field, ['name', 'formcontrolname', 'id', 'placholder', 'aria-label'], names)) {
      if (!checkAttributes(field, ['name', 'formcontrolname', 'id', 'placeholder', 'aria-label'], exclusionNames) && field.type !== 'hidden') {
        return field
      }
    }
  }
  return null
}

// Shortcut to get username fields from a page.
function getBestUsernameField () {
  return getBestInput(['user', 'name', 'mail', 'login', 'auth', 'identifier', 'account', 'acct'], ['confirm', 'filename'], ['text', 'email'])
}

// Shortcut to get password fields from a page.
function getBestPasswordField () {
  return getBestInput([], [], ['password'])
}

// Get a "confirm password" field, that is different from the given password input
function getPasswordConfirmationField (primaryField) {
  const autocompleteMarkedFields = Array.from(document.querySelectorAll('[autocomplete="new-password"]'))
  // If there is at lest one marked field in the docuemnt, assume the confirm password field is marked too
  if (autocompleteMarkedFields.length > 0) {
    return autocompleteMarkedFields.find(field => field !== primaryField)
  } else {
    const bestConfirmInput = getBestInput(['confirm', 'retype'], [], ['password'])
    if (bestConfirmInput && bestConfirmInput !== primaryField) {
      return bestConfirmInput
    }
  }
  return null
}

// Removes credentials list overlay.
function removeAutocompleteList () {
  if (currentAutocompleteList && currentAutocompleteList.parentNode) {
    currentAutocompleteList.parentNode.removeChild(currentAutocompleteList)
  }
}

// Populates username/password fields with provided credentials.
function fillCredentials (credentials) {
  const { username, password } = credentials
  const inputEvents = ['keydown', 'keypress', 'keyup', 'input', 'change']

  const usernameField = getBestUsernameField()
  if (usernameField) {
    usernameField.value = username
    for (const event of inputEvents) {
      usernameField.dispatchEvent(new Event(event, { bubbles: true }))
    }
  }

  const passwordField = getBestPasswordField()
  if (passwordField) {
    passwordField.value = password
    for (const event of inputEvents) {
      passwordField.dispatchEvent(new Event(event, { bubbles: true }))
    }
  }
}

// Setup a focus/click listener on the username input fields.
//
// When those events happen, we add a small overlay with a list of matching
// credentials. Clicking on an item in a list populates the input fields with
// selected username/password pair.
//
// - element: input field to add a listener to
// - credentials: an array of { username, password } objects
function addFocusListener (element, credentials) {
  const inputRect = element.getBoundingClientRect()
  // Creates an options list container.
  function buildContainer () {
    const suggestionsDiv = document.createElement('div')
    suggestionsDiv.style = 'position: absolute; border: 1px solid #d4d4d4; z-index: 999999; border-bottom: none; background: #FFFFFF; transform: scale(0); opacity: 0; transform-origin: top left; transition: 0.15s; color: #000000;'
    suggestionsDiv.style.top = (inputRect.y + inputRect.height) + 'px'
    suggestionsDiv.style.left = (inputRect.x) + 'px'
    suggestionsDiv.id = 'password-autocomplete-list'
    requestAnimationFrame(function () {
      suggestionsDiv.style.opacity = '1'
      suggestionsDiv.style.transform = 'scale(1)'
    })
    return suggestionsDiv
  }

  // Adds an option row to the list container.
  function addOption (parent, username) {
    const suggestionItem = document.createElement('div')
    suggestionItem.textContent = username
    suggestionItem.style = 'padding: 10px; cursor: pointer; background-color: #fff; border-bottom: 1px solid #d4d4d4;'

    // Hover.
    suggestionItem.addEventListener('mouseenter', (event) => {
      suggestionItem.style.backgroundColor = '#e4e4e4'
    })
    suggestionItem.addEventListener('mouseleave', (event) => {
      suggestionItem.style.backgroundColor = '#fff'
    })

    // When user clicks on the suggestion, we populate the form inputs with selected credentials.
    suggestionItem.addEventListener('click', function (e) {
      const selectedCredentials = credentials.filter(el => { return el.username === username })[0]
      fillCredentials(selectedCredentials)
      removeAutocompleteList()
      element.focus()
    })

    parent.appendChild(suggestionItem)
  }

  // Creates autocomplete list and adds it below the activated field.
  function showAutocompleteList (e) {
    removeAutocompleteList()
    const container = buildContainer()
    for (const cred of credentials) {
      addOption(container, cred.username)
    }
    document.body.appendChild(container)
    currentAutocompleteList = container
  }

  element.addEventListener('focus', showAutocompleteList)
  element.addEventListener('click', showAutocompleteList)

  // Hide options overlay when user clicks out of the input field.
  document.addEventListener('click', function (e) {
    if (e.target !== element) {
      removeAutocompleteList()
    }
  })

  // Show the autocomplete list right away if field is already focused.
  // Userful for login pages which auto-focus the input field on page load.
  if (element === document.activeElement) {
    showAutocompleteList()
  }
}

function requestAutofill () {
  if (getBestUsernameField() && getBestPasswordField()) {
    ipc.send('password-autofill')
  }
}

function maybeAddUnlockButton (target) {
  // require both a username and a password field to reduce the false-positive rate
  if (target instanceof Node && getBestUsernameField() && getBestPasswordField()) {
    if (getBestUsernameField().isSameNode(target) || getBestPasswordField().isSameNode(target)) {
      const unlockButton = createUnlockButton(target)
      document.body.appendChild(unlockButton)

      currentUnlockButton = unlockButton
    }
  }
}

function checkInitialFocus () {
  maybeAddUnlockButton(document.activeElement)
}

function handleFocus (event) {
  maybeAddUnlockButton(event.target)
}

function handleBlur (event) {
  if (currentUnlockButton !== null && currentUnlockButton.parentElement != null) {
    currentUnlockButton.parentElement.removeChild(currentUnlockButton)
    currentUnlockButton = null
  }
}

// Handle credentials fetched from the backend. Credentials are expected to be
// an array of { username, password, manager } objects.
ipc.on('password-autofill-match', (event, data) => {
  if (data.hostname !== window.location.hostname) {
    throw new Error('password origin must match current page origin')
  }

  if (data.credentials.length === 0) {
    if (currentUnlockButton && currentUnlockButton.children.length > 0) {
      currentUnlockButton.children[0].style.color = 'rgb(180, 0, 0)'
    }
  } else if (data.credentials.length === 1) {
    fillCredentials(data.credentials[0])
    const firstPasswordField = getBestPasswordField()
    if (firstPasswordField) {
      firstPasswordField.focus()
    }
  } else {
    const firstField = getBestUsernameField()
    if (firstField) {
      addFocusListener(firstField, data.credentials)
      firstField.focus()
    }
  }
})

// Trigger autofill check from keyboard shortcut.
ipc.on('password-autofill-shortcut', (event) => {
  requestAutofill()
})

// Autofill enabled event handler. Initializes focus listeners for input fields.
ipc.on('password-autofill-enabled', (event) => {
  checkInitialFocus()

  // Add default focus event listeners.
  window.addEventListener('blur', handleBlur, true)
  window.addEventListener('focus', handleFocus, true)
})

// Check if password autofill is configured.
window.addEventListener('load', function (event) {
  ipc.send('password-autofill-check')
})

// send passwords back to the main process so they can be saved to storage
function handleFormSubmit () {
  var usernameValue = getBestUsernameField()?.value
  var passwordValue = getBestPasswordField()?.value

  if ((usernameValue && usernameValue.length > 0) && (passwordValue && passwordValue.length > 0)) {
    ipc.send('password-form-filled', [window.location.hostname, usernameValue, passwordValue])
  }
}

window.addEventListener('submit', handleFormSubmit)

// watch for clicks on button[type=submit]
window.addEventListener('click', function (e) {
  const path = (e.path) || (e.composed && e.composedPath())
  if (!path) {
    return
  }
  path.forEach(function (el) {
    if (el.tagName === 'BUTTON' && el.getAttribute('type') === 'submit' && !el.disabled) {
      handleFormSubmit()
    }
  })
}, true)

electron.webFrame.executeJavaScript(`
var origSubmit = HTMLFormElement.prototype.submit;
HTMLFormElement.prototype.submit = function () {
  window.postMessage({message: 'formSubmit'})
  origSubmit.apply(this, arguments)
}
`)

window.addEventListener('message', function (e) {
  if (e.data && e.data.message && e.data.message === 'formSubmit') {
    handleFormSubmit()
  }
})

const passwordGenerationCharset = 'bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ0123456789-_!'

function fillWithInputEvent (input, value) {
  input.value = value
  const simulatedEvent = new InputEvent('input', {
    inputType: 'insertReplacementText',
    data: value
  })
  input.dispatchEvent(simulatedEvent)
}

/*
Multiple generation requests use the same password for a 5-minute period so that it's easier to fill "confirm password" fields
Since this script is part of the preload, it will only persist for a single page navigation
*/
let priorGeneratedPassword = ''

ipc.on('generate-password', function (location) {
  var input = (document.activeElement.matches('input[type=password]')) ? document.activeElement : Array.from(document.elementsFromPoint(location.x, location.y)).filter(el => el.matches('input[type=password]'))

  if (input) {
    let generatedPassword = ''

    if (priorGeneratedPassword) {
      generatedPassword = priorGeneratedPassword
    } else {
      // Math.random would probably suffice also, as the page is about to have access to the password anyway once we insert it into the field.
      const values = new Uint8Array(16)
      crypto.getRandomValues(values)

      values.forEach(function (value) {
        generatedPassword += passwordGenerationCharset[Math.floor((value / 256) * passwordGenerationCharset.length)]
      })

      priorGeneratedPassword = generatedPassword
      setTimeout(() => {
        priorGeneratedPassword = ''
      }, 5 * 60 * 1000)
    }

    fillWithInputEvent(input, generatedPassword)

    var confirmationInput = getPasswordConfirmationField(input)

    if (confirmationInput) {
      fillWithInputEvent(confirmationInput, generatedPassword)
    }

    setTimeout(function () {
      if (input.value === generatedPassword) {
        var usernameValue = getBestUsernameField()?.value
        ipc.send('password-form-filled', [window.location.hostname, usernameValue, generatedPassword])
      }
    }, 0)
  }
})
;
const maxCharsToTranslate = 200000

function isVisible (el) {
  // https://github.com/jquery/jquery/blob/305f193aa57014dc7d8fa0739a3fefd47166cd44/src/css/hiddenVisibleSelectors.js
  return el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)
}

function getNodes (doc, win) {
  var maybeNodes = [].slice.call(doc.body.childNodes)
  var textNodes = []

  var ignore = 'link, style, script, noscript, .hidden, [class*="-hidden"], .visually-hidden, .visuallyhidden, [role=presentation], [hidden], [style*="display:none"], [style*="display: none"], .ad, .dialog, .modal, select, svg, details:not([open])'

  ignore += ', pre, code'

  while (maybeNodes.length) {
    var node = maybeNodes.shift()

    // if the node should be ignored, skip it and all of it's child nodes
    if (node.matches && node.matches(ignore)) {
      continue
    }

    // if the node is a text node, add it to the list of text nodes

    if (node.nodeType === 3) {
      textNodes.push(node)
      continue
    }

    if (!isVisible(node)) {
      continue
    }

    // otherwise, add the node's text nodes to the list of text, and the other child nodes to the list of nodes to check
    var childNodes = node.childNodes
    var cnl = childNodes.length

    for (var i = cnl - 1; i >= 0; i--) {
      var childNode = childNodes[i]
      maybeNodes.unshift(childNode)
    }
  }

  return textNodes
}

async function translate (destLang) {
  var nodes = getNodes(document, window)

  var titleElement = document.querySelector('title')
  if (titleElement && titleElement.childNodes && titleElement.childNodes[0]) {
    nodes.unshift(titleElement.childNodes[0])
  }

  // try to also extract text for same-origin iframes (such as the reader mode frame)

  var frames = document.querySelectorAll('iframe')

  for (var x = 0; x < frames.length; x++) {
    try {
      nodes = nodes.concat(getNodes(frames[x].contentDocument, frames[x].contentWindow))
    } catch (e) { }
  }

  var nodesSet = nodes.filter(n => n.textContent.replace(/[\s0-9]+/g, '').length > 2).map(n => ({ node: n, translated: false, originalLength: n.textContent.length }))

  const channel = new MessageChannel()

  ipc.postMessage('page-translation-session-create', null, [channel.port1])
  channel.port2.start()

  function handleChunk () {
    // rescore the nodes

    var selectionParent
    try {
      selectionParent = window.getSelection().getRangeAt(0).commonAncestorContainer
    } catch (e) {
    }

    var sortedNodes = nodesSet.map(item => {
      item.score = 0
      if (selectionParent && selectionParent.contains(item.node)) {
        item.score += 2
      }
      try {
        var rect = item.node.parentNode.getBoundingClientRect()
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          item.score += 1
        }
      } catch (e) {}
      return item
    }).sort((a, b) => b.score - a.score)

    // select up to 1k chars from the untranslated set

    var nodesInQuery = []
    var charsSelected = 0
    sortedNodes.forEach(function (item) {
      if (charsSelected < 500 && !item.translated) {
        nodesInQuery.push(item.node)
        charsSelected += item.node.textContent.length
      }
    })

    var query = nodesInQuery.map(node => node.textContent)

    channel.port2.onmessage = function (e) {
      e.data.translatedText.forEach(function (text, i) {
        var rootNodeIndex = nodesSet.findIndex(item => item.node === nodesInQuery[i])

        if (query[i].startsWith(' ')) {
          text = ' ' + text
        }
        if (query[i].endsWith(' ')) {
          text += ' '
        }

        /*
        When the Libretranslate model encounters unknown vocabulary (or the language auto-detect is wrong),
        it sometimes produces very long, nonsensical output. Try to detect that and skip the translation.
        */
        if (query[i].length > 2 && (text.length / query[i].length > 20)) {
          console.warn('skipping possibly invalid translation: ', query[i], ' -> ', text)
          return
        }

        /*
        The English model frequently produces translations in lowercase.
        As a workaround, capitalize the first character if the original was uppercase
        */
        if (destLang === 'en') {
          var originalFirstChar = query[i][0]
          if (originalFirstChar && originalFirstChar.toUpperCase() === originalFirstChar) {
            text = text[0].toUpperCase() + text.substring(1)
          }
        }

        nodesSet[rootNodeIndex].node.textContent = text
        nodesSet[rootNodeIndex].translated = true
      })

      console.log('translated ', nodesSet.filter(item => item.translated).map(item => item.originalLength).reduce((a, b) => a + b), 'chars')
      if (nodesSet.filter(item => item.translated).map(item => item.originalLength).reduce((a, b) => a + b) < maxCharsToTranslate && nodesSet.some(item => !item.translated)) {
        handleChunk()
      }
    }

    channel.port2.postMessage({
      type: 'translation-request',
      query,
      lang: destLang
    })
  }

  handleChunk()
}

ipc.on('translate-page', function (e, lang) {
  translate(lang)
})
;
