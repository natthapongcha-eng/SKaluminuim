/**
 * Components Loader
 * Dynamically loads modular dashboard components
 * 
 * Usage: Add placeholder divs in HTML and call loadComponent()
 * Example: loadComponent('announcement-banner', '#announcement-container')
 */

const componentLoader = {
    /**
     * Load a single component
     * @param {string} componentName - name of component file (without .html)
     * @param {string} targetSelector - CSS selector where to inject component
     */
    async loadComponent(componentName, targetSelector) {
        try {
            const response = await fetch(`components/${componentName}.html`);
            if (!response.ok) throw new Error(`Failed to load ${componentName}`);
            
            const html = await response.text();
            const target = document.querySelector(targetSelector);
            
            if (target) {
                target.innerHTML = html;
                console.log(`✓ Loaded component: ${componentName}`);
            } else {
                console.warn(`Target element not found: ${targetSelector}`);
            }
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
        }
    },

    /**
     * Load multiple components at once
     * @param {Object} components - { componentName: targetSelector, ... }
     */
    async loadComponents(components) {
        const promises = Object.entries(components).map(([name, selector]) => 
            this.loadComponent(name, selector)
        );
        
        await Promise.all(promises);
        console.log('✓ All components loaded');
    }
};

// Auto-load all dashboard components when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Define which components to load and where
    const dashboardComponents = {
        'announcement-banner': '#announcement-container',
        'hero-section': '#hero-container',
        'stats-section': '#stats-container',
        'gallery-section': '#gallery-container',
        'policies-section': '#policies-container',
        'questions-section': '#questions-container'
    };

    // Check if we're on dashboard page
    if (document.querySelector('.dashboard-page')) {
        await componentLoader.loadComponents(dashboardComponents);
    }
});
