/**
 * Advanced Tab Management System for Ouro Browser
 * Features: Virtual scrolling, lazy loading, tab pooling, smart caching
 */

const EventEmitter = require('events')

class TabPool {
  constructor(maxTabs = 100) {
    this.tabs = new Map()
    this.maxTabs = maxTabs
    this.activeTabId = null
    this.tabHistory = []
    this.events = new EventEmitter()
    this.virtualizer = new TabVirtualizer()
  }

  /**
   * Create a new tab with advanced features
   * @param {Object} config - Tab configuration
   */
  createTab(config = {}) {
    const tabId = `tab_${Date.now()}_${Math.random()}`
    
    const tab = {
      id: tabId,
      url: config.url || 'about:newtab',
      title: config.title || 'New Tab',
      icon: config.icon || null,
      thumbnail: null,
      lastAccessed: Date.now(),
      visitCount: 0,
      isPinned: config.isPinned || false,
      isMuted: false,
      loadTime: 0,
      memoryUsage: 0,
      state: 'loading', // loading, ready, error, suspended
      savedState: null, // for session restore
      metadata: {
        createdAt: Date.now(),
        description: '',
        favicon: null,
        isPrivate: config.isPrivate || false
      }
    }

    this.tabs.set(tabId, tab)
    this.updateTabHistory(tabId)
    this.events.emit('tab-created', { tab })

    // Auto-suspend inactive tabs after 5 minutes
    if (this.tabs.size > 5) {
      this.autoSuspendInactiveTabs()
    }

    return tab
  }

  /**
   * Switch to a tab with smooth animation
   */
  switchTab(tabId) {
    const previousTabId = this.activeTabId
    const tab = this.tabs.get(tabId)

    if (!tab) return false

    // Suspend the previous tab
    if (previousTabId) {
      this.suspendTab(previousTabId)
    }

    // Resume the target tab
    if (tab.state === 'suspended') {
      this.resumeTab(tabId)
    }

    this.activeTabId = tabId
    tab.lastAccessed = Date.now()
    tab.visitCount++
    this.updateTabHistory(tabId)

    this.events.emit('tab-switched', { from: previousTabId, to: tabId })
    return true
  }

  /**
   * Virtual scrolling - only render visible tabs
   */
  getVisibleTabs(startIndex = 0, visibleCount = 10) {
    const allTabs = Array.from(this.tabs.values())
    return allTabs.slice(startIndex, startIndex + visibleCount)
  }

  /**
   * Suspend inactive tabs to save memory
   */
  suspendTab(tabId) {
    const tab = this.tabs.get(tabId)
    if (tab && tab.state !== 'suspended') {
      tab.state = 'suspended'
      tab.savedState = this.captureTabState(tabId)
      this.events.emit('tab-suspended', { tabId })
    }
  }

  /**
   * Resume a suspended tab
   */
  resumeTab(tabId) {
    const tab = this.tabs.get(tabId)
    if (tab && tab.state === 'suspended') {
      tab.state = 'loading'
      this.restoreTabState(tabId, tab.savedState)
      this.events.emit('tab-resumed', { tabId })
    }
  }

  /**
   * Auto-suspend tabs that haven't been accessed recently
   */
  autoSuspendInactiveTabs(inactivityTime = 5 * 60 * 1000) {
    const now = Date.now()
    Array.from(this.tabs.values()).forEach(tab => {
      if (
        tab.id !== this.activeTabId &&
        tab.state !== 'suspended' &&
        now - tab.lastAccessed > inactivityTime
      ) {
        this.suspendTab(tab.id)
      }
    })
  }

  /**
   * Calculate tab priority using frecency algorithm
   */
  calculateFrecency(tab) {
    const now = Date.now()
    const ageInDays = (now - tab.metadata.createdAt) / (24 * 60 * 60 * 1000)
    const recency = 1 / (1 + ageInDays)
    const frequency = tab.visitCount / this.tabs.size
    
    return (frequency * 0.7) + (recency * 0.3)
  }

  /**
   * Get top frecency-ranked tabs
   */
  getTopTabs(limit = 10) {
    return Array.from(this.tabs.values())\n      .sort((a, b) => this.calculateFrecency(b) - this.calculateFrecency(a))\n      .slice(0, limit)
  }

  /**
   * Close a tab
   */
  closeTab(tabId, updateHistory = true) {
    const tab = this.tabs.get(tabId)
    if (!tab) return false

    // Save tab state for undo
    this.recentlyClosed = { tab, closedAt: Date.now() }

    this.tabs.delete(tabId)
    this.events.emit('tab-closed', { tabId, tab })

    // Switch to next available tab
    if (this.activeTabId === tabId) {
      const nextTab = Array.from(this.tabs.keys())[0]
      if (nextTab) this.switchTab(nextTab)
    }

    return true
  }

  /**
   * Undo close tab (restore from recently closed)
   */
  undoCloseTab() {
    if (this.recentlyClosed) {
      const { tab } = this.recentlyClosed
      this.tabs.set(tab.id, tab)
      this.events.emit('tab-restored', { tab })
      return tab
    }
    return null
  }

  /**
   * Save tab state for session restore
   */
  captureTabState(tabId) {
    return {
      url: this.tabs.get(tabId)?.url,
      title: this.tabs.get(tabId)?.title,
      timestamp: Date.now()
    }
  }

  /**
   * Restore tab state
   */
  restoreTabState(tabId, savedState) {
    const tab = this.tabs.get(tabId)
    if (tab && savedState) {
      tab.url = savedState.url
      tab.state = 'ready'
      this.events.emit('tab-state-restored', { tabId })
    }
  }

  /**
   * Update tab history for frecency calculation
   */
  updateTabHistory(tabId) {
    this.tabHistory = this.tabHistory.filter(id => id !== tabId)
    this.tabHistory.unshift(tabId)
    if (this.tabHistory.length > 100) {
      this.tabHistory.pop()
    }
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    let total = 0
    let suspended = 0
    let active = 0

    Array.from(this.tabs.values()).forEach(tab => {
      if (tab.state === 'suspended') {
        suspended += tab.memoryUsage
      } else {
        active += tab.memoryUsage
      }
      total += tab.memoryUsage
    })

    return { total, active, suspended, tabCount: this.tabs.size }
  }

  /**
   * Group tabs by domain for tab grouping feature
   */
  groupTabsByDomain() {
    const groups = new Map()
    Array.from(this.tabs.values()).forEach(tab => {
      const url = new URL(tab.url)
      const domain = url.hostname
      if (!groups.has(domain)) {
        groups.set(domain, [])
      }
      groups.get(domain).push(tab)
    })
    return groups
  }

  /**
   * Search tabs
   */
  searchTabs(query) {
    const q = query.toLowerCase()
    return Array.from(this.tabs.values()).filter(tab =>
      tab.title.toLowerCase().includes(q) ||
      tab.url.toLowerCase().includes(q)
    )
  }
}

class TabVirtualizer {
  constructor() {
    this.startIndex = 0
    this.visibleCount = 10
  }

  updateScroll(scrollPosition, itemHeight, containerHeight) {
    this.startIndex = Math.floor(scrollPosition / itemHeight)
    this.visibleCount = Math.ceil(containerHeight / itemHeight) + 2
  }

  getVisibleRange() {
    return {
      start: this.startIndex,
      end: this.startIndex + this.visibleCount
    }
  }
}

module.exports = TabPool
