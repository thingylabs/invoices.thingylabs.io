// ui.js

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', initUI);

function initUI() {
    // Company configuration toggle
    const configToggle = document.getElementById('configToggle');
    const configSection = document.getElementById('configSection');
    
    configToggle.addEventListener('click', function() {
        configSection.classList.toggle('visible');
        configToggle.textContent = configSection.classList.contains('visible') 
            ? 'Hide Company Configuration' 
            : 'Show Company Configuration';
    });
    
    // Theme Switcher Functionality
    const root = document.documentElement;
    const buttons = document.querySelectorAll('.theme-switcher button');
    
    // Get saved theme from localStorage or default to 'auto'
    const savedTheme = localStorage.getItem('theme') || 'auto';
    setTheme(savedTheme);

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.dataset.theme;
            setTheme(theme);
            localStorage.setItem('theme', theme);
        });
    });

    function setTheme(theme) {
        root.setAttribute('data-theme', theme);
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.theme === theme);
        });
    }
    
    // Copy Button Functionality
    const copyButtons = document.querySelectorAll('.copy-btn, .copy-group-btn');
    
    copyButtons.forEach(button => {
        button.addEventListener('click', function() {
            const textToCopy = this.getAttribute('data-copy');
            navigator.clipboard.writeText(textToCopy).then(() => {
                // Visual feedback
                const originalText = this.textContent;
                this.textContent = this.classList.contains('copy-btn') ? 'Kopiert!' : 'Adresse kopiert!';
                this.classList.add('success');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    this.textContent = originalText;
                    this.classList.remove('success');
                }, 2000);
            });
        });
    });
    
    // Smooth Scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}
