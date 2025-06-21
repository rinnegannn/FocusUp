// Background script for FocusPal Chrome Extension
class FocusPalBackground {
    constructor() {
        this.distractingSites = [
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
        
        this.lastNotificationTime = 0;
        this.notificationCooldown = 30000; // 30 seconds
        this.blockedToday = 0;
        this.focusMode = false;
        
        // Site tracking for time limits
        this.siteTracking = {
            currentSite: null,
            startTime: null,
            tempAccess: new Map(), // Track temporary access per site
            activeTabId: null
        };
        
        // Timer state
        this.timerState = {
            isRunning: false,
            isPaused: false,
            currentTime: 25 * 60, // 25 minutes in seconds
            originalTime: 25 * 60,
            startTime: null
        };
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.loadStoredData();
        this.resetDailyStats();
        this.loadTimerState();
    }
    
    setupEventListeners() {
        // Listen for tab updates
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.status === 'complete' && tab.url) {
                this.handleTabChange(tabId, tab);
            }
        });
        
        // Listen for tab activation
        chrome.tabs.onActivated.addListener(async (activeInfo) => {
            try {
                const tab = await chrome.tabs.get(activeInfo.tabId);
                if (tab.url) {
                    this.handleTabChange(activeInfo.tabId, tab);
                }
            } catch (error) {
                console.error('Error getting active tab:', error);
            }
        });
        
        // Listen for tab removal (user closes tab)
        chrome.tabs.onRemoved.addListener((tabId) => {
            if (tabId === this.siteTracking.activeTabId) {
                this.stopSiteTracking();
            }
        });
        
        // Listen for messages from popup and content scripts
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            this.handleMessage(message, sender, sendResponse);
            return true; // Keep message channel open for async responses
        });
        
        // Reset daily stats at midnight
        chrome.alarms.create('resetDaily', { 
            when: this.getNextMidnight(),
            periodInMinutes: 24 * 60 
        });
        
        // Timer alarm for updating every second
        chrome.alarms.create('timerTick', { 
            delayInMinutes: 0,
            periodInMinutes: 1/60 // Every second
        });
        
        // Site tracking alarm - check every 30 seconds
        chrome.alarms.create('siteTrackingCheck', {
            delayInMinutes: 0,
            periodInMinutes: 0.5 // Every 30 seconds
        });
        
        chrome.alarms.onAlarm.addListener((alarm) => {
            if (alarm.name === 'resetDaily') {
                this.resetDailyStats();
            } else if (alarm.name === 'timerTick') {
                this.updateTimer();
            } else if (alarm.name === 'siteTrackingCheck') {
                this.checkSiteTimeLimit();
            }
        });
    }
    
    async handleTabChange(tabId, tab) {
        const url = new URL(tab.url);
        const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
        
        // Check if this is a distracting site
        const isDistracting = this.distractingSites.some(site => 
            hostname.includes(site) || site.includes(hostname)
        );
        
        if (isDistracting) {
            // Check if user has temporary access for this site
            const tempAccess = this.siteTracking.tempAccess.get(hostname);
            const hasValidAccess = tempAccess && Date.now() < tempAccess;
            
            if (!hasValidAccess) {
                // Start tracking time for this site
                this.startSiteTracking(hostname, tabId);
                // Show immediate nudge
                await this.checkForDistraction(tab);
            }
        } else {
            // Not a distracting site, stop tracking
            this.stopSiteTracking();
        }
    }
    
    startSiteTracking(site, tabId) {
        this.siteTracking = {
            currentSite: site,
            startTime: Date.now(),
            tempAccess: this.siteTracking.tempAccess, // Preserve existing temp access
            activeTabId: tabId
        };
        console.log(`Started tracking ${site}`);
    }
    
    stopSiteTracking() {
        if (this.siteTracking.currentSite) {
            console.log(`Stopped tracking ${this.siteTracking.currentSite}`);
        }
        this.siteTracking = {
            currentSite: null,
            startTime: null,
            tempAccess: this.siteTracking.tempAccess, // Preserve temp access
            activeTabId: null
        };
    }
    
    async checkSiteTimeLimit() {
        if (!this.siteTracking.currentSite || !this.siteTracking.startTime) {
            return;
        }
        
        const timeSpent = Date.now() - this.siteTracking.startTime;
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // Check if user has been on the site for more than 5 minutes
        if (timeSpent > fiveMinutes) {
            console.log(`User has been on ${this.siteTracking.currentSite} for more than 5 minutes`);
            
            try {
                // Get the current active tab to send nudge
                const tab = await chrome.tabs.get(this.siteTracking.activeTabId);
                if (tab && tab.url) {
                    await this.handleDistraction(tab, await this.getSettings());
                }
            } catch (error) {
                console.error('Error sending 5-minute nudge:', error);
            }
            
            // Reset tracking to avoid spamming (will start again on next tab change)
            this.stopSiteTracking();
        }
    }
    
    async getSettings() {
        try {
            return await chrome.storage.sync.get([
                'extensionEnabled',
                'notifications', 
                'strictMode'
            ]);
        } catch (error) {
            console.error('Error getting settings:', error);
            return {};
        }
    }
    
    grantTemporaryAccess(site, durationMinutes = 5) {
        const expiryTime = Date.now() + (durationMinutes * 60 * 1000);
        this.siteTracking.tempAccess.set(site, expiryTime);
        console.log(`Granted ${durationMinutes} minutes access to ${site}`);
        
        // Stop current tracking since user has temp access
        this.stopSiteTracking();
    }
    
    async loadStoredData() {
        try {
            const result = await chrome.storage.sync.get([
                'blockedCount',
                'extensionEnabled',
                'customSites',
                'notifications',
                'sound',
                'strictMode',
                'timerState'
            ]);
            
            this.blockedToday = result.blockedCount || 0;
            
            if (result.customSites) {
                this.distractingSites = [...this.distractingSites, ...result.customSites];
            }
        } catch (error) {
            console.error('Error loading stored data:', error);
        }
    }
    
    async loadTimerState() {
        try {
            const result = await chrome.storage.local.get('timerState');
            if (result.timerState) {
                this.timerState = { ...this.timerState, ...result.timerState };
                
                // If timer was running when extension was closed, calculate elapsed time
                if (this.timerState.isRunning && this.timerState.startTime) {
                    const now = Date.now();
                    const elapsed = Math.floor((now - this.timerState.startTime) / 1000);
                    this.timerState.currentTime = Math.max(0, this.timerState.currentTime - elapsed);
                    
                    if (this.timerState.currentTime <= 0) {
                        this.completeTimer();
                    } else {
                        this.timerState.startTime = now; // Reset start time for accurate future calculations
                        await this.saveTimerState();
                    }
                }
            }
        } catch (error) {
            console.error('Error loading timer state:', error);
        }
    }
    
    async saveTimerState() {
        try {
            await chrome.storage.local.set({ timerState: this.timerState });
        } catch (error) {
            console.error('Error saving timer state:', error);
        }
    }
    
    async updateTimer() {
        if (!this.timerState.isRunning || this.timerState.isPaused) {
            return;
        }
        
        const now = Date.now();
        if (this.timerState.startTime) {
            const elapsed = Math.floor((now - this.timerState.startTime) / 1000);
            const newCurrentTime = Math.max(0, this.timerState.originalTime - elapsed);
            
            if (newCurrentTime !== this.timerState.currentTime) {
                this.timerState.currentTime = newCurrentTime;
                await this.saveTimerState();
                
                // Notify popup if it's open
                try {
                    chrome.runtime.sendMessage({ 
                        action: 'timerUpdate', 
                        currentTime: this.timerState.currentTime,
                        isRunning: this.timerState.isRunning,
                        isPaused: this.timerState.isPaused
                    });
                } catch (error) {
                    // Popup might not be open, ignore error
                }
                
                if (this.timerState.currentTime <= 0) {
                    this.completeTimer();
                }
            }
        }
    }
    
    async startTimer() {
        this.timerState.isRunning = true;
        this.timerState.isPaused = false;
        this.timerState.startTime = Date.now();
        this.timerState.originalTime = this.timerState.currentTime;
        this.focusMode = true;
        
        await this.saveTimerState();
        console.log('Timer started in background');
    }
    
    async pauseTimer() {
        if (this.timerState.isRunning && !this.timerState.isPaused) {
            this.timerState.isPaused = true;
            // Calculate remaining time
            const now = Date.now();
            const elapsed = Math.floor((now - this.timerState.startTime) / 1000);
            this.timerState.currentTime = Math.max(0, this.timerState.originalTime - elapsed);
            await this.saveTimerState();
            console.log('Timer paused in background');
        } else if (this.timerState.isPaused) {
            // Resume timer
            this.timerState.isPaused = false;
            this.timerState.startTime = Date.now();
            this.timerState.originalTime = this.timerState.currentTime;
            await this.saveTimerState();
            console.log('Timer resumed in background');
        }
    }
    
    async resetTimer() {
        this.timerState.isRunning = false;
        this.timerState.isPaused = false;
        this.timerState.currentTime = 25 * 60;
        this.timerState.originalTime = 25 * 60;
        this.timerState.startTime = null;
        this.focusMode = false;
        
        await this.saveTimerState();
        console.log('Timer reset in background');
    }
    
    async completeTimer() {
        this.timerState.isRunning = false;
        this.timerState.isPaused = false;
        this.timerState.currentTime = 25 * 60;
        this.timerState.originalTime = 25 * 60;
        this.timerState.startTime = null;
        this.focusMode = false;
        
        await this.saveTimerState();
        
        // Update focus streak
        await this.updateFocusStreak();
        
        this.showSuccessNotification();
        
        // Notify popup if it's open
        try {
            chrome.runtime.sendMessage({ 
                action: 'timerCompleted',
                currentTime: this.timerState.currentTime,
                isRunning: this.timerState.isRunning,
                isPaused: this.timerState.isPaused
            });
        } catch (error) {
            // Popup might not be open, ignore error
        }
        
        console.log('Timer completed in background');
    }
    
    async updateFocusStreak() {
        try {
            const result = await chrome.storage.sync.get('focusStreak');
            const newStreak = (result.focusStreak || 0) + 25;
            await chrome.storage.sync.set({ focusStreak: newStreak });
        } catch (error) {
            console.error('Error updating focus streak:', error);
        }
    }
    
    async checkForDistraction(tab) {
        try {
            const settings = await chrome.storage.sync.get([
                'extensionEnabled',
                'notifications',
                'strictMode'
            ]);
            
            // Check if extension is enabled
            if (settings.extensionEnabled === false) {
                return;
            }
            
            const url = new URL(tab.url);
            const hostname = url.hostname.toLowerCase();
            
            // Remove www. prefix for matching
            const cleanHostname = hostname.replace(/^www\./, '');
            
            // Check if current site is distracting
            const isDistracting = this.distractingSites.some(site => 
                cleanHostname.includes(site) || site.includes(cleanHostname)
            );
            
            if (isDistracting) {
                await this.handleDistraction(tab, settings);
            }
            
        } catch (error) {
            console.error('Error checking for distraction:', error);
        }
    }
    
    async handleDistraction(tab, settings) {
        const now = Date.now();
        
        // Check cooldown to prevent spam
        if (now - this.lastNotificationTime < this.notificationCooldown) {
            return;
        }
        
        this.lastNotificationTime = now;
        this.blockedToday++;
        
        // Update storage
        await chrome.storage.sync.set({ blockedCount: this.blockedToday });
        
        // Show notification if enabled
        if (settings.notifications !== false) {
            this.showFocusReminder(tab);
        }
        
        // In strict mode, close the tab or redirect
        if (settings.strictMode === true) {
            this.handleStrictMode(tab);
        }
        
        // Send message to popup if it's open
        try {
            chrome.runtime.sendMessage({ 
                action: 'updateBlockedCount', 
                count: this.blockedToday 
            });
        } catch (error) {
            // Popup might not be open, ignore error
        }
    }
    
    showFocusReminder(tab) {
        const messages = [
            "🎯 Time to refocus! Let's get back to work.",
            "⏰ Taking a break? Remember your goals!",
            "🚀 Stay productive! You've got this!",
            "💪 Focus mode activated. You're stronger than the distraction!",
            "🔥 Keep the momentum going!",
            "✨ Your future self will thank you for staying focused.",
            "🎉 Every focused minute counts towards your success!",
            "🌟 Discipline today, success tomorrow.",
            "⚡ You've been here for 5+ minutes! Time to refocus!",
            "🕒 5 minutes flew by! Let's get back to productivity!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'FocusPal Reminder',
            message: randomMessage,
            buttons: [
                { title: 'Stay Focused' },
                { title: 'Take 5 min break' }
            ]
        });
    }
    
    async handleStrictMode(tab) {
        // In strict mode, redirect to a focus page or close tab
        const focusPageUrl = chrome.runtime.getURL('focus.html');
        
        try {
            await chrome.tabs.update(tab.id, { url: focusPageUrl });
        } catch (error) {
            console.error('Error redirecting in strict mode:', error);
        }
    }
    
    async handleMessage(message, sender, sendResponse) {
        switch (message.action) {
            case 'getTimerState':
                sendResponse({
                    currentTime: this.timerState.currentTime,
                    isRunning: this.timerState.isRunning,
                    isPaused: this.timerState.isPaused
                });
                break;
                
            case 'startTimer':
                await this.startTimer();
                sendResponse({ success: true });
                break;
                
            case 'pauseTimer':
                await this.pauseTimer();
                sendResponse({ success: true });
                break;
                
            case 'resetTimer':
                await this.resetTimer();
                sendResponse({ success: true });
                break;
                
            case 'grantTempAccess':
                // Handle temporary access request from content script
                if (message.site) {
                    this.grantTemporaryAccess(message.site, 5);
                    sendResponse({ success: true });
                }
                break;
                
            case 'extensionToggled':
                console.log('Extension toggled:', message.enabled);
                break;
                
            case 'timerStarted':
                this.focusMode = true;
                console.log('Focus timer started from popup');
                break;
                
            case 'timerCompleted':
                this.focusMode = false;
                this.showSuccessNotification();
                break;
                
            case 'timerReset':
                this.focusMode = false;
                console.log('Focus timer reset from popup');
                break;
                
            case 'settingChanged':
                console.log(`Setting changed: ${message.setting} = ${message.value}`);
                break;
                
            default:
                console.log('Unknown message:', message);
        }
    }
    
    showSuccessNotification() {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: '🎉 Focus Session Complete!',
            message: 'Great job! You completed a 25-minute focus session. Take a well-deserved break!'
        });
    }
    
    async resetDailyStats() {
        this.blockedToday = 0;
        await chrome.storage.sync.set({ 
            blockedCount: 0,
            focusStreak: 0 
        });
        console.log('Daily stats reset');
    }
    
    getNextMidnight() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
    }
}

// Initialize background script
const focusPal = new FocusPalBackground();

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    if (buttonIndex === 0) {
        // Stay Focused clicked - close notification
        chrome.notifications.clear(notificationId);
    } else if (buttonIndex === 1) {
        // Take 5 min break clicked
        chrome.notifications.clear(notificationId);
        
        // Grant temporary access to current site
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
                focusPal.grantTemporaryAccess(hostname, 5);
            }
        } catch (error) {
            console.error('Error granting temp access from notification:', error);
        }
        
        // Set a 5-minute break timer
        chrome.alarms.create('breakTime', { delayInMinutes: 5 });
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Break Time!',
            message: '5-minute break started. Relax and recharge!'
        });
    }
});

// Handle break time alarm
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'breakTime') {
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'Break Over!',
            message: 'Time to get back to focused work. You got this!'
        });
    }
});

console.log('FocusPal background script initialized');