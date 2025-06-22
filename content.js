/*
-------------------------------------------------------
Content script for FocusUp Chrome Extension - FIXED
-------------------------------------------------------
Project:    SpurHacks
Team:       23gibbs
Date:       2025-06-21
-------------------------------------------------------
*/

class FocusUpContent {
    // Constructor Variables
    constructor() {
        // Variable for whether or not the content is visible
        this.overlayVisible = false;
        // Variable for the settings
        this.settings = {};
        // Variable to track if we've shown initial overlay for this session
        this.initialOverlayShown = false;
        this.init();
    }
    
    async init() {
        console.log('FocusUp content script initializing...');
        
        // Load settings
        await this.loadSettings();
        console.log('Settings loaded:', this.settings);
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
        
        // FIXED: Immediate check for current site
        this.checkCurrentSite();
        
        // FIXED: Also check after a short delay to ensure page is fully loaded
        setTimeout(() => {
            console.log('Delayed site check...');
            this.checkCurrentSite();
        }, 2000);
    }
    
    async loadSettings() {
        // Try and Catch Statement to load the settings
        try {
            this.settings = await chrome.storage.sync.get([
                'extensionEnabled',
                'notifications',
                'strictMode',
                'sound'
            ]);
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }
    
    checkCurrentSite() {
        const distractingSites = [
            'youtube.com',
            'twitter.com',
            'x.com',
            'facebook.com',
            'instagram.com',
            'reddit.com',
            'tiktok.com',
            'netflix.com',
            'twitch.tv',
            'pinterest.com',
            'linkedin.com',
            'snapchat.com',
            'discord.com',
            'whatsapp.com',
            'telegram.org'
        ];
        
        const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
        const currentUrl = window.location.href;
        
        console.log('Checking current site:', hostname, 'URL:', currentUrl);
        
        const isDistracting = distractingSites.some(site => 
            hostname.includes(site) || site.includes(hostname)
        );
        
        console.log('Is distracting:', isDistracting);
        console.log('Extension enabled:', this.settings.extensionEnabled !== false);
        console.log('Initial overlay shown:', this.initialOverlayShown);
        console.log('Has temp access:', this.hasTemporaryAccess());
        
        // FIXED: Only show overlay if site is distracting, extension is enabled, 
        // we haven't shown it yet, and we don't have temporary access
        if (isDistracting && 
            this.settings.extensionEnabled !== false && 
            !this.initialOverlayShown && 
            !this.hasTemporaryAccess()) {
            
            console.log('Showing initial focus overlay');
            this.showInitialFocusOverlay();
            this.initialOverlayShown = true;
        }
    }
    
    // FIXED: Renamed to distinguish from 5-minute warning overlay
    showInitialFocusOverlay() {
        if (this.overlayVisible) return;
        
        this.createFocusOverlay('initial', {
            title: 'Time to Focus!',
            message: 'You\'re visiting a potentially distracting site. Remember your goals!',
            quote: '"The successful warrior is the average person with laser-like focus." - Bruce Lee',
            primaryButton: 'Stay Focused',
            secondaryButton: 'Continue (5 min)'
        });
    }
    
    // NEW: Show 5-minute warning overlay
    show5MinuteWarning(site, timeSpent) {
        if (this.overlayVisible) return;
        
        const minutes = Math.floor(timeSpent / 60);
        const seconds = timeSpent % 60;
        
        this.createFocusOverlay('5minute', {
            title: '⏰ 5-Minute Focus Alert!',
            message: `You've been on ${site} for ${minutes}m ${seconds}s. Time to refocus!`,
            quote: '"Discipline is choosing between what you want now and what you want most."',
            primaryButton: 'Get Back to Work',
            secondaryButton: 'Give me 5 more minutes'
        });
    }
    
    // FIXED: Generalized overlay creation method
    createFocusOverlay(type, config) {
        const overlay = document.createElement('div');
        overlay.id = `focusup-overlay-${type}`;
        overlay.className = 'focusup-overlay';
        overlay.innerHTML = `
            <div class="focusup-modal">
                <div class="focusup-header">
                    <h2>${config.title}</h2>
                    <button class="focusup-close" data-close="${type}">×</button>
                </div>
                <div class="focusup-content">
                    <p>${config.message}</p>
                    <div class="focusup-quote">
                        <em>${config.quote}</em>
                    </div>
                    <div class="focusup-actions">
                        <button class="focusup-btn focusup-btn-primary" data-action="primary" data-type="${type}">
                            ${config.primaryButton}
                        </button>
                        <button class="focusup-btn focusup-btn-secondary" data-action="secondary" data-type="${type}">
                            ${config.secondaryButton}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // FIXED: Only add styles once
        if (!document.getElementById('focusup-styles')) {
            this.addStyles();
        }
        
        // Add overlay to document
        document.body.appendChild(overlay);
        this.overlayVisible = true;
        
        // Add event listeners
        this.setupOverlayEventListeners(overlay, type);
    }
    
    // FIXED: Improved event listener setup
    setupOverlayEventListeners(overlay, type) {
        // Close button
        overlay.querySelector(`[data-close="${type}"]`).addEventListener('click', () => {
            this.hideOverlay(type);
        });
        
        // Action buttons
        overlay.querySelectorAll('[data-action]').forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.getAttribute('data-action');
                const overlayType = e.target.getAttribute('data-type');
                this.handleOverlayAction(action, overlayType);
            });
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideOverlay(type);
            }
        });
    }
    
    // FIXED: Handle different overlay actions
    handleOverlayAction(action, type) {
        if (type === 'initial') {
            if (action === 'primary') { // Stay Focused
                window.history.back();
            } else if (action === 'secondary') { // Continue (5 min)
                this.hideOverlay(type);
                this.requestTemporaryAccess();
            }
        } else if (type === '5minute') {
            if (action === 'primary') { // Get Back to Work
                this.hideOverlay(type);
                window.history.back();
            } else if (action === 'secondary') { // Give me 5 more minutes
                this.hideOverlay(type);
                this.requestTemporaryAccess();
            }
        }
    }
    
    // FIXED: Request temporary access from background script
    requestTemporaryAccess() {
        const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
        
        chrome.runtime.sendMessage({
            action: 'grantTempAccess',
            site: hostname
        }, (response) => {
            if (response && response.success) {
                console.log('Temporary access granted');
                // Set local session storage as backup
                this.setTemporaryAccess();
            }
        });
    }
    
    hideOverlay(type = 'initial') {
        const overlay = document.getElementById(`focusup-overlay-${type}`) || 
                       document.querySelector('.focusup-overlay');
        if (overlay) {
            overlay.remove();
            this.overlayVisible = false;
        }
    }
    
    setTemporaryAccess() {
        // Set a temporary access token that expires in 5 minutes
        const expiryTime = Date.now() + (5 * 60 * 1000);
        sessionStorage.setItem('focusup-temp-access', expiryTime.toString());
    }
    
    hasTemporaryAccess() {
        const tempAccess = sessionStorage.getItem('focusup-temp-access');
        if (!tempAccess) return false;
        
        const expiryTime = parseInt(tempAccess);
        return Date.now() < expiryTime;
    }
    
    // FIXED: Add styles only once
    addStyles() {
        const styles = `
            .focusup-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(10px);
                z-index: 2147483647;
                display: flex;
                justify-content: center;
                align-items: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .focusup-modal {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                color: white;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: focusup-slideIn 0.3s ease-out;
                position: relative;
            }
            
            @keyframes focusup-slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .focusup-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .focusup-header h2 {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
            }
            
            .focusup-close {
                background: rgba(255, 255, 255, 0.2);
                border: none;
                color: white;
                font-size: 24px;
                width: 35px;
                height: 35px;
                border-radius: 50%;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: background 0.3s ease;
            }
            
            .focusup-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .focusup-content p {
                font-size: 16px;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            
            .focusup-quote {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 25px;
                text-align: center;
                font-style: italic;
            }
            
            .focusup-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
                flex-wrap: wrap;
            }
            
            .focusup-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
            }
            
            .focusup-btn-primary {
                background: #4CAF50;
                color: white;
            }
            
            .focusup-btn-primary:hover {
                background: #45a049;
                transform: translateY(-2px);
            }
            
            .focusup-btn-secondary {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .focusup-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
            
            /* FIXED: Responsive design for smaller screens */
            @media (max-width: 600px) {
                .focusup-modal {
                    margin: 20px;
                    padding: 20px;
                }
                
                .focusup-actions {
                    flex-direction: column;
                }
                
                .focusup-btn {
                    width: 100%;
                }
            }
        `;
        
        // Add styles to document
        const styleSheet = document.createElement('style');
        styleSheet.id = 'focusup-styles';
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
    
    // FIXED: Enhanced message handling
    handleMessage(message, sender, sendResponse) {
        console.log('Content script received message:', message);
        
        switch (message.action) {
            case 'showFocusReminder':
                // Only show if we don't have temporary access and no overlay is visible
                if (!this.hasTemporaryAccess() && !this.overlayVisible) {
                    this.showInitialFocusOverlay();
                }
                sendResponse({ success: true });
                break;
                
            case 'show5MinuteWarning':
                // NEW: Handle 5-minute warning from background script
                if (!this.overlayVisible) {
                    this.show5MinuteWarning(message.site, message.timeSpent);
                }
                sendResponse({ success: true });
                break;
                
            case 'settingChanged':
                this.settings[message.setting] = message.value;
                
                // If extension was disabled, hide any visible overlays
                if (message.setting === 'extensionEnabled' && message.value === false) {
                    this.hideOverlay('initial');
                    this.hideOverlay('5minute');
                }
                sendResponse({ success: true });
                break;
                
            case 'tempAccessGranted':
                // NEW: Handle temporary access granted notification
                console.log('Temporary access granted for this site');
                this.setTemporaryAccess();
                this.hideOverlay('initial');
                this.hideOverlay('5minute');
                sendResponse({ success: true });
                break;
                
            default:
                console.log('Unknown message action:', message.action);
                sendResponse({ success: false, error: 'Unknown action' });
        }
    }
}

// FIXED: Improved initialization
let focusUpContent = null;

function initializeFocusUp() {
    if (focusUpContent) return; // Prevent multiple initializations
    
    focusUpContent = new FocusUpContent();
    console.log('FocusUp content script initialized');
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeFocusUp);
} else {
    initializeFocusUp();
}

// FIXED: Handle dynamic navigation (for SPAs like YouTube)
let lastUrl = location.href;

// Method 1: Watch for URL changes using MutationObserver
const urlObserver = new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        console.log('URL changed from', lastUrl, 'to', url);
        lastUrl = url;
        handleUrlChange();
    }
});

// Method 2: Override pushState and replaceState (YouTube navigation)
const originalPushState = history.pushState;
const originalReplaceState = history.replaceState;

history.pushState = function() {
    originalPushState.apply(history, arguments);
    setTimeout(handleUrlChange, 100);
};

history.replaceState = function() {
    originalReplaceState.apply(history, arguments);
    setTimeout(handleUrlChange, 100);
};

// Method 3: Listen for popstate events (back/forward buttons)
window.addEventListener('popstate', () => {
    setTimeout(handleUrlChange, 100);
});

// Method 4: Periodic URL checking as fallback
let urlCheckInterval = setInterval(() => {
    const url = location.href;
    if (url !== lastUrl) {
        console.log('URL changed detected by interval check');
        lastUrl = url;
        handleUrlChange();
    }
}, 2000); // Check every 2 seconds

function handleUrlChange() {
    console.log('Handling URL change to:', location.href);
    
    // Reset state for new page/video
    if (focusUpContent) {
        focusUpContent.initialOverlayShown = false;
        
        // Small delay to let the page content load
        setTimeout(() => {
            focusUpContent.checkCurrentSite();
        }, 500);
    }
}

// Start observing DOM changes
urlObserver.observe(document.body, { 
    subtree: true, 
    childList: true 
});

// Cleanup function
window.addEventListener('beforeunload', () => {
    if (urlCheckInterval) {
        clearInterval(urlCheckInterval);
    }
    urlObserver.disconnect();
});