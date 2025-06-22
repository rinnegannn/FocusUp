/*
-------------------------------------------------------
Content script for FocusUp Chrome Extension
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
        overlay.id = 'focusup-overlay';
        overlay.innerHTML = `
            <div class="focusup-modal">
                <div class="focusup-header">
                    <h2>Time to Focus!</h2>
                    <button class="focusup-close" id="focusup-close">×</button>
                </div>
                <div class="focusup-content">
                    <p>You're visiting a potentially distracting site. Remember your goals!</p>
                    <div class="focusup-quote">
                        <em>"The successful warrior is the average person with laser-like focus." - Bruce Lee</em>
                    </div>
                    <div class="focusup-actions">
                        <button class="focusup-btn focusup-btn-primary" id="focusup-stay-focused">
                            Stay Focused
                        </button>
                        <button class="focusup-btn focusup-btn-secondary" id="focusup-continue">
                            Continue (5 min)
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add styles
        const styles = `
            #focusup-overlay {
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
        `;
        
        // Add styles to document
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        
        // Add overlay to document
        document.body.appendChild(overlay);
        this.overlayVisible = true;
        
        // Add event listeners
        document.getElementById('focusup-close').addEventListener('click', () => {
            this.hideOverlay();
        });
        
        document.getElementById('focusup-stay-focused').addEventListener('click', () => {
            window.history.back();
        });
        
        document.getElementById('focusup-continue').addEventListener('click', () => {
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
        const overlay = document.getElementById('focusup-overlay');
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
        new FocusUpContent();
    });
} else {
    new FocusUpContent();
}