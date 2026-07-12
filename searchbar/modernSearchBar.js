/**
 * Modern Search Bar with Chrome-like Features
 * Autocomplete, Suggestions, Keyboard Navigation, Recent Searches
 */

const EventEmitter = require('events')

class ModernSearchBar {
  constructor() {
    this.element = document.getElementById('searchbar') || this.createSearchBar()
    this.input = this.element.querySelector('input')
    this.resultsList = this.element.querySelector('.searchbar-results')
    this.events = new EventEmitter()
    
    this.suggestions = []
    this.selectedIndex = -1
    this.recentSearches = this.loadRecentSearches()
    this.debounceTimer = null
    
    this.initialize()
  }

  /**
   * Create modern search bar HTML
   */
  createSearchBar() {
    const container = document.createElement('div')
    container.id = 'searchbar'
    container.className = 'modern-searchbar'
    container.innerHTML = `
      <div class="searchbar-wrapper">
        <div class="searchbar-input-container">
          <i class="icon-search"></i>
          <input 
            type="text" 
            placeholder="Search with DuckDuckGo..." 
            class="searchbar-input"
            autocomplete="off"
          />
          <button class="searchbar-clear">✕</button>
        </div>
        <div class="searchbar-results" hidden></div>
      </div>
    `
    document.body.insertBefore(container, document.getElementById('webviews'))
    return container
  }

  /**
   * Initialize event listeners
   */
  initialize() {
    this.input.addEventListener('input', (e) => this.handleInput(e))
    this.input.addEventListener('keydown', (e) => this.handleKeydown(e))
    this.input.addEventListener('focus', () => this.showRecentSearches())
    
    document.querySelector('.searchbar-clear').addEventListener('click', () => {
      this.input.value = ''
      this.hideSuggestions()
    })

    document.addEventListener('click', (e) => {
      if (!this.element.contains(e.target)) {
        this.hideSuggestions()
      }
    })
  }

  /**
   * Handle input with debouncing
   */
  handleInput(e) {
    clearTimeout(this.debounceTimer)
    const query = e.target.value.trim()

    this.debounceTimer = setTimeout(() => {
      if (query.length > 0) {
        this.fetchSuggestions(query)
      } else {
        this.showRecentSearches()
      }
    }, 150)
  }

  /**
   * Fetch suggestions from multiple sources
   */
  async fetchSuggestions(query) {
    this.suggestions = []
    this.selectedIndex = -1

    // Get history suggestions
    const historySuggestions = this.getHistorySuggestions(query)
    this.suggestions.push(...historySuggestions)

    // Get search engine suggestions
    const searchSuggestions = await this.getSearchSuggestions(query)
    this.suggestions.push(...searchSuggestions)

    // Remove duplicates
    this.suggestions = [...new Map(
      this.suggestions.map(item => [item.text, item])
    ).values()]

    // Limit to 10 suggestions
    this.suggestions = this.suggestions.slice(0, 10)

    this.renderSuggestions()
    this.showSuggestions()
  }

  /**
   * Get suggestions from browser history
   */
  getHistorySuggestions(query) {
    // This would integrate with actual history storage
    const suggestions = []
    
    // Example implementation
    const historyItems = [
      { title: 'GitHub - Build software better', url: 'https://github.com' },
      { title: 'Google Search', url: 'https://google.com' },
      { title: 'Mozilla Firefox Browser', url: 'https://mozilla.org' }
    ]

    historyItems.forEach(item => {
      if (item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.url.toLowerCase().includes(query.toLowerCase())) {
        suggestions.push({
          type: 'history',
          text: item.title,
          url: item.url,
          icon: '📜',
          frecency: Math.random() * 100
        })
      }
    })

    return suggestions.sort((a, b) => b.frecency - a.frecency)
  }

  /**
   * Get suggestions from search engine
   */
  async getSearchSuggestions(query) {
    try {
      // Using DuckDuckGo API for suggestions\n      const response = await fetch(\n        `https://duckduckgo.com/ac/?q=${encodeURIComponent(query)}&kp=-2`\n      )
      const data = await response.json()
      
      return (data || []).map(item => ({
        type: 'suggestion',
        text: item.phrase || item,
        url: null,
        icon: '🔍',
        frecency: 0
      })).slice(0, 5)
    } catch (e) {
      console.warn('Failed to fetch search suggestions:', e)
      return []
    }
  }

  /**
   * Show recent searches when input is empty
   */
  showRecentSearches() {
    if (this.input.value.trim().length === 0) {
      this.suggestions = this.recentSearches.map(search => ({
        type: 'recent',
        text: search,
        url: null,
        icon: '⏱️',
        frecency: 0
      }))
      this.renderSuggestions()
      this.showSuggestions()
    }
  }

  /**
   * Render suggestions to DOM
   */
  renderSuggestions() {
    this.resultsList.innerHTML = ''
    
    this.suggestions.forEach((suggestion, index) => {
      const item = document.createElement('div')
      item.className = 'searchbar-item'
      item.setAttribute('data-index', index)
      
      let content = ''
      
      if (suggestion.type === 'history' || suggestion.type === 'suggestion') {
        content = `
          <span class="searchbar-icon">${suggestion.icon}</span>
          <div class="searchbar-item-content">
            <div class="searchbar-item-title">${this.highlightQuery(suggestion.text)}</div>
            ${suggestion.url ? `<div class="searchbar-item-url">${suggestion.url}</div>` : ''}
          </div>
        `
      } else {
        content = `
          <span class="searchbar-icon">${suggestion.icon}</span>
          <span class="searchbar-item-text">${suggestion.text}</span>
        `
      }
      
      item.innerHTML = content
      item.addEventListener('click', () => this.selectSuggestion(index))
      item.addEventListener('mouseenter', () => this.highlightItem(index))
      
      this.resultsList.appendChild(item)
    })
  }

  /**
   * Highlight matching query in suggestions
   */
  highlightQuery(text) {
    const query = this.input.value.trim()
    if (!query) return text
    
    const regex = new RegExp(`(${query})`, 'gi')
    return text.replace(regex, '<strong>$1</strong>')
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(e) {
    if (this.resultsList.hidden) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        this.selectNext()
        break
      case 'ArrowUp':
        e.preventDefault()
        this.selectPrevious()
        break
      case 'Enter':
        e.preventDefault()
        if (this.selectedIndex >= 0) {
          this.selectSuggestion(this.selectedIndex)
        } else {
          this.search(this.input.value)
        }
        break
      case 'Escape':
        this.hideSuggestions()
        break
    }
  }

  /**
   * Select next suggestion
   */
  selectNext() {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1)
    this.highlightItem(this.selectedIndex)
  }

  /**
   * Select previous suggestion
   */
  selectPrevious() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1)
    if (this.selectedIndex >= 0) {
      this.highlightItem(this.selectedIndex)
    }
  }

  /**
   * Highlight a specific item
   */
  highlightItem(index) {
    document.querySelectorAll('.searchbar-item').forEach((item, i) => {
      item.classList.toggle('highlighted', i === index)
    })
    this.selectedIndex = index
  }

  /**
   * Select a suggestion
   */
  selectSuggestion(index) {
    const suggestion = this.suggestions[index]
    if (!suggestion) return

    if (suggestion.url) {
      this.events.emit('url-selected', { url: suggestion.url })
    } else {
      this.search(suggestion.text)
    }

    this.addRecentSearch(suggestion.text)
    this.hideSuggestions()
  }

  /**
   * Perform search
   */
  search(query) {
    const url = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
    this.events.emit('url-selected', { url })
    this.addRecentSearch(query)
  }

  /**
   * Add to recent searches
   */
  addRecentSearch(query) {
    this.recentSearches = this.recentSearches.filter(s => s !== query)
    this.recentSearches.unshift(query)
    if (this.recentSearches.length > 20) {
      this.recentSearches.pop()
    }
    this.saveRecentSearches()
  }

  /**
   * Save recent searches to localStorage
   */
  saveRecentSearches() {
    localStorage.setItem('ouro_recent_searches', JSON.stringify(this.recentSearches))
  }

  /**
   * Load recent searches from localStorage
   */
  loadRecentSearches() {
    try {
      return JSON.parse(localStorage.getItem('ouro_recent_searches') || '[]')
    } catch (e) {
      return []
    }
  }

  /**
   * Show suggestions
   */
  showSuggestions() {
    this.resultsList.hidden = false
  }

  /**
   * Hide suggestions
   */
  hideSuggestions() {
    this.resultsList.hidden = true
    this.selectedIndex = -1
  }

  /**
   * Clear recent searches
   */
  clearRecentSearches() {
    this.recentSearches = []
    this.saveRecentSearches()
  }
}

module.exports = ModernSearchBar
