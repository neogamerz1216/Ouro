const EventEmitter = require('events')

function getDraggableChild (target, container) {
  if (!target || !container || !target.closest) {
    return null
  }

  const candidate = target.closest('.tab-item')
  if (!candidate || candidate.parentElement !== container) {
    return null
  }

  return candidate
}

function getSiblingFromPointer (item, pointerX) {
  const rect = item.getBoundingClientRect()
  const midpoint = rect.left + (rect.width / 2)
  return pointerX < midpoint ? item : item.nextElementSibling
}

module.exports = function dragula (containers) {
  const emitter = new EventEmitter()
  let draggedElement = null
  let sourceContainer = null

  function applyDraggableState (container) {
    Array.from(container.children).forEach(child => {
      child.draggable = true
    })
  }

  function cleanupDragState () {
    if (draggedElement) {
      draggedElement.classList.remove('gu-transit')
    }
    document.body.classList.remove('gu-unselectable')
    draggedElement = null
    sourceContainer = null
  }

  containers.forEach(container => {
    applyDraggableState(container)

    const observer = new MutationObserver(function () {
      applyDraggableState(container)
    })
    observer.observe(container, { childList: true })

    container.addEventListener('dragstart', function (e) {
      const item = getDraggableChild(e.target, container)
      if (!item) {
        return
      }

      draggedElement = item
      sourceContainer = container
      draggedElement.classList.add('gu-transit')
      document.body.classList.add('gu-unselectable')

      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', item.getAttribute('data-tab') || '')
      }
    })

    container.addEventListener('dragover', function (e) {
      if (!draggedElement) {
        return
      }

      e.preventDefault()
      const hoveredItem = getDraggableChild(e.target, container)
      const sibling = hoveredItem ? getSiblingFromPointer(hoveredItem, e.clientX) : null

      if (sibling !== draggedElement) {
        container.insertBefore(draggedElement, sibling)
      }
    })

    container.addEventListener('drop', function (e) {
      if (!draggedElement) {
        return
      }

      e.preventDefault()
      emitter.emit('drop', draggedElement, container, sourceContainer, draggedElement.nextElementSibling)
      cleanupDragState()
    })

    container.addEventListener('dragend', cleanupDragState)
  })

  emitter.destroy = function () {}
  return emitter
}
