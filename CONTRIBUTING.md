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

### 2. Project Structure

```
Ouro/
├── js/                    # Browser logic & UI
│   ├── browserUI.js      # Main UI controller
│   ├── webviews.js       # Tab management
│   ├── navbar/           # Navigation bar
│   ├── searchbar/        # Search engine
│   ├── passwordManager/  # Password vault
│   ├── places/           # History/bookmarks
│   └── util/             # Utilities
├── css/                   # Stylesheets
│   ├── base.css          # Core styles
│   ├── tabBar.css        # Tab bar
│   └── ...
├── main/                  # Electron main process
├── scripts/               # Build tools
└── pages/                 # Special pages
```

---

## 📝 Code Style & Standards

### JavaScript (ES6+)

```javascript
// ✅ Good
class TabManager {
  constructor(config = {}) {
    this.tabs = [];
    this.activeIndex = 0;
    this.config = {
      maxTabs: 100,
      ...config
    };
  }

  createTab(url) {
    const tab = new Tab(url);
    this.tabs.push(tab);
    return tab;
  }

  getActiveTab() {
    return this.tabs[this.activeIndex];
  }
}

// ❌ Avoid
function createTab(url) {
  var tab = {};
  tab.url = url;
  tabs.push(tab);
  return tab;
}
```

### CSS

```css
/* ✅ Good - Use BEM methodology */
.tab-bar {
  display: flex;
  align-items: center;
  background: var(--bg-color);
}

.tab-bar__item {
  padding: 8px 12px;
  cursor: pointer;
  transition: background-color 150ms ease;
}

.tab-bar__item--active {
  background-color: var(--accent-color);
}

/* ❌ Avoid - Deep nesting, magic numbers */
.tab-bar {
  .tab {
    padding: 8px;
    &:hover {
      padding: 7px;
    }
  }
}
```

### HTML

```html
<!-- ✅ Good - Semantic, accessible -->
<nav id="navbar" class="navbar" role="navigation">
  <button id="back-button" aria-label="Go back" class="navbar-btn">
    <i class="icon-back"></i>
  </button>
</nav>

<!-- ❌ Avoid - Non-semantic, poor accessibility -->
<div onclick="goBack()" class="navbar">
  <span>←</span>
</div>
```

---

## 🧪 Testing

### Run Tests

```bash
npm test              # Run linter
npm run lint          # Fix linting issues
```

### Test Before Committing

```bash
npm run test          # Must pass
npm run build         # Must succeed
npm run startElectron # Must not crash
```

---

## 📋 Pull Request Process

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name

# Branch naming convention:
# feature/add-dark-mode
# bugfix/fix-tab-crash
# perf/optimize-startup
# docs/update-readme
```

### 2. Make Your Changes

```bash
# Edit files
# Test your changes
# Commit with clear messages
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

# Go to GitHub and create Pull Request
```

### 4. PR Checklist

Before submitting, ensure:

- ✅ Code follows style guide
- ✅ All tests pass (`npm test`)
- ✅ No console errors or warnings
- ✅ Meaningful commit messages
- ✅ Updated README if needed
- ✅ Added comments for complex code
- ✅ No unnecessary dependencies added

### 5. PR Description Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Performance improvement
- [ ] Documentation

## Testing
How was this tested? Include steps to reproduce.

## Screenshots (if applicable)
Add before/after screenshots.

## Related Issues
Closes #123

## Checklist
- [ ] Code follows style guide
- [ ] Tests pass
- [ ] No breaking changes
```

---

## 🐛 Bug Reports

### Report a Bug

1. Go to [Issues](https://github.com/neogamerz1216/Ouro/issues/new)
2. Use the bug report template
3. Include:
   - Reproduction steps
   - Expected vs actual behavior
   - Screenshots/video
   - System info (OS, version)
   - Browser console errors

### Bug Report Template

```markdown
## Description
What is the bug?

## Steps to Reproduce
1. Open Ouro
2. Navigate to...
3. Click...
4. See crash

## Expected Behavior
What should happen?

## Actual Behavior
What actually happens?

## Screenshots
[Attach images]

## System Info
- OS: Windows 10
- Browser Version: 1.0.0
- Node Version: 16.0.0
```

---

## 💡 Feature Requests

### Suggest a Feature

1. Go to [Issues](https://github.com/neogamerz1216/Ouro/issues/new)
2. Use feature request template
3. Explain the use case

### Feature Request Template

```markdown
## Description
Brief description of the feature.

## Use Case
Why is this feature useful?

## Implementation Ideas
How might this be implemented?

## Mockups
[Attach designs if applicable]
```

---

## 🎨 Design Contribution

### How to Contribute Designs

1. **Fork** the repository
2. **Create** designs (Figma, Adobe XD, etc.)
3. **Export** as PNG/SVG
4. **Add** to PR with design rationale
5. **Discuss** with team

### Design Guidelines

- Use the Ouro design system
- Follow accessibility standards (WCAG 2.1 AA)
- Mobile-first responsive design
- 60fps performance target

---

## 📚 Documentation

### Contributing Docs

1. **README.md** - Main documentation
2. **FEATURES.md** - Feature documentation
3. **UI_UX_PERFORMANCE_ROADMAP.md** - Roadmap
4. **Inline comments** - Code documentation

### Writing Good Comments

```javascript
// ❌ Bad - Obvious what code does
const x = y + 1;  // add one to y

// ✅ Good - Explains WHY, not WHAT
// Calculate frecency score for history ranking
// (frequency * recency model)
const frecencyScore = visitCount * (1 / (1 + ageInDays));
```

---

## 🔄 Development Workflow

### Daily Workflow

```bash
# Start day
git pull origin main
npm install

# Create feature branch
git checkout -b feature/my-feature

# Make changes and test
npm start

# Commit changes
git add .
git commit -m "feat: describe your change"

# Push and create PR
git push origin feature/my-feature
```

### Code Review Checklist

Before requesting review:

- [ ] No console errors
- [ ] Passes all tests
- [ ] Code is clean and documented
- [ ] No unnecessary dependencies
- [ ] Performance impact considered
- [ ] Mobile tested
- [ ] Accessibility checked

---

## 🚀 Performance Guidelines

### When Adding Features

1. **Profile first** - Use Chrome DevTools
2. **Optimize** - Don't add bloat
3. **Measure** - Track impact
4. **Test** - Ensure no regressions

### Performance Checklist

```javascript
// Efficient code
✅ Use requestAnimationFrame for animations
✅ Debounce/throttle event handlers
✅ Virtual scroll long lists
✅ Lazy load images
✅ Code split large features
❌ Don't use heavy libraries (moment.js, lodash)
❌ Don't query DOM repeatedly
❌ Don't block main thread
```

---

## 📞 Communication

### Getting Help

- **Issues**: Use GitHub Issues for bugs/features
- **Discussions**: Use GitHub Discussions for questions
- **Email**: pavantejamunagala777@gmail.com

### Code Review

- Be respectful and constructive
- Ask questions rather than criticize
- Provide examples and suggestions
- Acknowledge good work

---

## 📜 License

By contributing to Ouro, you agree that your contributions will be licensed under its Apache 2.0 License.

---

## 🎉 Thanks for Contributing!

Your contributions help make Ouro the fastest browser on the planet. We appreciate every pull request, bug report, and suggestion!

**Happy coding!** 🚀

---

**Questions?** Open an issue or email us!
