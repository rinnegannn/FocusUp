// Content script for FocusPal - runs on all web pages
class FocusPalContent {
    constructor() {
        this.overlayVisible = false;
        this.settings = {};
        this.init();
    }
    
    async init() {
        // Load settings
        await this.loadSettings();
        
        // Listen for messages from background script
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
        });
        
        // Check if current site is distracting
        this.checkCurrentSite();
    }
    
    async loadSettings() {
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
            'telegram.org',
            'news.ycombinator.com',
            'buzzfeed.com',
            'imgur.com',
            '9gag.com',
            'medium.com'
        ];
        
        const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
        
        const isDistracting = distractingSites.some(site => 
            hostname.includes(site) || site.includes(hostname)
        );
        
        if (isDistracting && this.settings.extensionEnabled !== false) {
            this.showFocusOverlay();
        }
    }
    
    showFocusOverlay() {
        if (this.overlayVisible) return;
        
        const overlay = document.createElement('div');
        overlay.id = 'focuspal-overlay';
        overlay.innerHTML = `
            <div class="focuspal-modal">
                <div class="focuspal-header">
                    <h2>🎯 Time to Focus!</h2>
                    <button class="focuspal-close" id="focuspal-close">×</button>
                </div>
                <div class="focuspal-content">
                    <p>You're visiting a potentially distracting site. Remember your goals!</p>
                    <div class="focuspal-quote">
                        <em>"The successful warrior is the average person with laser-like focus." - Bruce Lee</em>
                    </div>
                    <div class="focuspal-actions">
                        <button class="focuspal-btn focuspal-btn-primary" id="focuspal-stay-focused">
                            Stay Focused
                        </button>
                        <button class="focuspal-btn focuspal-btn-secondary" id="focuspal-continue">
                            Continue (5 min)
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        const styles = `
            #focuspal-overlay {
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
            
            .focuspal-modal {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 500px;
                width: 90%;
                color: white;
                box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
                animation: focuspal-slideIn 0.3s ease-out;
                position: relative;
            }
            
            @keyframes focuspal-slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
            
            .focuspal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
            }
            
            .focuspal-header h2 {
                margin: 0;
                font-size: 24px;
                font-weight: bold;
            }
            
            .focuspal-close {
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
            
            .focuspal-close:hover {
                background: rgba(255, 255, 255, 0.3);
            }
            
            .focuspal-content p {
                font-size: 16px;
                margin-bottom: 20px;
                line-height: 1.5;
            }
            
            .focuspal-quote {
                background: rgba(255, 255, 255, 0.1);
                padding: 15px;
                border-radius: 10px;
                margin-bottom: 25px;
                text-align: center;
                font-style: italic;
            }
            
            .focuspal-actions {
                display: flex;
                gap: 15px;
                justify-content: center;
            }
            
            .focuspal-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 10px;
                font-size: 16px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
            }
            
            .focuspal-btn-primary {
                background: #4CAF50;
                color: white;
            }
            
            .focuspal-btn-primary:hover {
                background: #45a049;
                transform: translateY(-2px);
            }
            
            .focuspal-btn-secondary {
                background: rgba(255, 255, 255, 0.2);
                color: white;
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .focuspal-btn-secondary:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
            }
        `;
        
        // Add styles to document
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        
        // Add overlay to document
        document.body.appendChild(overlay);
        this.overlayVisible = true;
        
        // Add event listeners
        document.getElementById('focuspal-close').addEventListener('click', () => {
            this.hideOverlay();
        });
        
        document.getElementById('focuspal-stay-focused').addEventListener('click', () => {
            window.history.back();
        });
        
        document.getElementById('focuspal-continue').addEventListener('click', () => {
            this.hideOverlay();
            this.setTemporaryAccess();
        });
        
        // Close on overlay click
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideOverlay();
            }
        });
    }
    
    hideOverlay() {
        const overlay = document.getElementById('focuspal-overlay');
        if (overlay) {
            overlay.remove();
            this.overlayVisible = false;
        }
    }
    
    setTemporaryAccess() {
        // Set a temporary access token that expires in 5 minutes
        const expiryTime = Date.now() + (5 * 60 * 1000);
        sessionStorage.setItem('focuspal-temp-access', expiryTime.toString());
    }
    
    hasTemporaryAccess() {
        const tempAccess = sessionStorage.getItem('focuspal-temp-access');
        if (!tempAccess) return false;
        
        const expiryTime = parseInt(tempAccess);
        return Date.now() < expiryTime;
    }
    
    handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'showFocusReminder':
                if (!this.hasTemporaryAccess()) {
                    this.showFocusOverlay();
                }
                break;
                
            case 'settingChanged':
                this.settings[message.setting] = message.value;
                break;
        }
    }
}

// Initialize content script when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new FocusPalContent();
    });
} else {
    new FocusPalContent();
}