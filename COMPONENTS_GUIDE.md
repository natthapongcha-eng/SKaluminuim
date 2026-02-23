# Dashboard Component Structure Guide

## Overview
The dashboard has been split into modular components so you and your team can work on different sections independently and easily merge your work.

## File Structure

```
dashboard.html                 # Main dashboard (now lightweight)
├── components/               # Individual component files
│   ├── announcement-banner.html    # Announcement display banner
│   ├── hero-section.html           # Vision & Mission section
│   ├── stats-section.html          # Company statistics cards
│   ├── gallery-section.html        # Project gallery
│   ├── policies-section.html       # Company policies grid
│   └── questions-section.html      # Questions & announcement editor
├── js/
│   ├── components-loader.js        # Component auto-loader (NEW)
│   ├── main.js                     # Main logic & announcement handler
│   └── api.js
└── css/
    └── style.css                   # Global styles
```

## How It Works

1. **Dashboard HTML** (`dashboard.html`)
   - Contains only the layout structure (sidebar, header, containers)
   - Uses placeholder `<div>` containers to load components
   - Automatically loads all components via JavaScript
   - Result: ~90% smaller HTML file for easier merging

2. **Components** (`components/` folder)
   - Each section is a separate `.html` file
   - Contains only the HTML markup for that section
   - Can be styled via shared CSS
   - Multiple people can edit different files without conflicts

3. **Component Loader** (`js/components-loader.js`)
   - Fetches each component file and injects it into the DOM
   - Runs automatically on page load
   - Provides manual API for loading components on-demand

## How to Collaborate

### Scenario: You and 2 Friends Working on Dashboard

**Setup:**
```bash
# Clone/share the repo
git clone <your-repo>

# Each person works on different components:
# Person A: components/hero-section.html
# Person B: components/gallery-section.html  
# Person C: components/policies-section.html
```

**Workflow:**
1. Each person edits their assigned component file
2. No one touches `dashboard.html` or `components-loader.js`
3. Commit changes: Git automatically merges component files
4. Final result: Dashboard loads all updated components

### Example: Adding Content to Hero Section

**File:** `components/hero-section.html`

```html
<!-- Edit this file to change vision/mission -->
<section class="hero-section">
    <div class="hero-content">
        <h2>Your New Title</h2>
        <p>Your new description</p>
    </div>
</section>
```

## Manual Component Loading

If you need to load a component dynamically (not auto-loaded):

```javascript
// Load single component
await componentLoader.loadComponent('hero-section', '#hero-container');

// Load multiple components
await componentLoader.loadComponents({
    'hero-section': '#hero-container',
    'stats-section': '#stats-container'
});
```

## Adding New Components

1. **Create component file**
   ```bash
   # Create: components/new-section.html
   <section class="new-section">
       <!-- Your HTML here -->
   </section>
   ```

2. **Add placeholder in dashboard.html**
   ```html
   <div id="new-section-container"></div>
   ```

3. **Register in components-loader.js**
   ```javascript
   const dashboardComponents = {
       'new-section': '#new-section-container',
       // ... other components
   };
   ```

## CSS & Styling

- All CSS is in `css/style.css`
- Component classes are already defined:
  - `.hero-section`
  - `.stats-section`
  - `.gallery-section`
  - `.policies-section`
  - `.questions-section`
  - `.announcement-banner`
  - `.announcement-editor`

## Merging Changes from Team

When pulling code from teammates:
1. New/modified component files automatically merge
2. CSS updates automatically merge
3. No conflicts in main HTML file (almost zero changes)
4. Reload browser to see updated components

## Tips

✅ **DO:**
- Work on separate component files
- Commit changes frequently
- Keep component HTML self-contained
- Share CSS class names via documentation

❌ **DON'T:**
- Modify `dashboard.html` main structure
- Add inline styles (use CSS file instead)
- Create duplicate components
- Load components multiple times

## Testing

Open [http://localhost:YOUR_PORT/dashboard.html](http://localhost:YOUR_PORT/dashboard.html) to verify all components load correctly.

Check browser console for:
- ✓ Loaded component messages (success)
- ⚠ Warnings if containers not found
- ✗ Errors if component files missing

---

**Questions?** Check `js/components-loader.js` for the loading logic or reach out to the team!
