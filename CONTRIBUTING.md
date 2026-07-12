# 🤝 Contributing to Ouro Browser

Thank you for your interest in contributing to Ouro! We welcome developers, designers, and enthusiasts to help make the fastest browser on the planet.

---

## 🚀 Getting Started

### 1. Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/neogamerz1216/Ouro.git
cd Ouro

# Install dependencies
npm install

# Start development mode
npm start

# This will:
# 1. Build all assets
# 2. Watch for file changes
# 3. Launch Ouro with hot-reload
```

### 2. Code Style & Standards

**JavaScript (ES6+)**
```javascript
// ✅ Good
class TabManager {
  constructor(config = {}) {
    this.tabs = [];
    this.config = config;
  }
}

// ❌ Avoid
function createTab() {
  var tab = {};
  return tab;
}
```

**CSS - Use BEM methodology**
```css
/* ✅ Good */
.tab-bar__item--active {
  background-color: var(--accent-color);
}

/* ❌ Avoid */
.tab-bar .tab:hover {
  padding: 7px;
}
```

---

## 🧪 Testing

```bash
npm test              # Run linter
npm run lint          # Fix linting issues
```

---

## 📋 Pull Request Process

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name

# Branch naming:
# feature/add-dark-mode
# bugfix/fix-tab-crash
# perf/optimize-startup
```

### 2. Make Your Changes

```bash
git add .
git commit -m "feat: add dark mode support

- Implement CSS variables for theming
- Add toggle in settings panel
- Store preference in localStorage
"
```

### 3. Push and Create PR

```bash
git push origin feature/your-feature-name
```

### 4. PR Checklist

- ✅ Code follows style guide
- ✅ All tests pass
- ✅ No console errors
- ✅ Updated README if needed
- ✅ No unnecessary dependencies

---

## 🐛 Bug Reports

Include:
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos
- System info (OS, version)

---

## 📚 Documentation

Update documentation for:
- README.md - Main docs
- FEATURES.md - Feature docs
- CONTRIBUTING.md - Contributing guide
- Inline comments - Code docs

---

## 🚀 Performance Guidelines

✅ DO:
- Use requestAnimationFrame for animations
- Debounce/throttle event handlers
- Virtual scroll long lists
- Lazy load images
- Code split large features

❌ DON'T:
- Add heavy libraries (moment.js, lodash)
- Query DOM repeatedly
- Block main thread
- Add unnecessary dependencies

---

## 📞 Questions?

Open an issue or email: pavantejamunagala777@gmail.com

**Happy coding!** 🚀