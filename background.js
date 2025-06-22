/*
-------------------------------------------------------
Background script for FocusUp Chrome Extension
-------------------------------------------------------
Project:    SpurHacks
Team:       23gibbs
Date:       2025-06-21
-------------------------------------------------------
*/

class FocusUpBackground {
    // Constructor Variables
    constructor() {
        // Variable for the list of sites blocked
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
            'telegram.org'
        ];
        // Variable for the time of the last notification
        this.lastNotificationTime = 0;
        // Variable for the cooldown after the last notification
        this.notificationCooldown = 30000; // 30 seconds
        // Variable for number of sites blocked
        this.blockedToday = 0;
        // Variable to determine if FocusUp was on
        this.focusMode = false;
        
        // Variable for site tracking for time limits
        this.siteTracking = {
            currentSite: null,
            startTime: null,
            tempAccess: new Map(), // Track temporary access per site
            activeTabId: null
        };
        
        // Variable for timer state
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
    
    // Listerner for chrome activities
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
        
        // Site tracking alarm by checking every 30 seconds
        chrome.alarms.create('siteTrackingCheck', {
            delayInMinutes: 0,
            periodInMinutes: 0.5 // Every 30 seconds
        });
        // Listener for the alarms played on chrome
        chrome.alarms.onAlarm.addListener((alarm) => {
            // If Statement to reset the daily states
            if (alarm.name === 'resetDaily') {
                this.resetDailyStats();
            } 
            // Else If Statement when updating the timer
            else if (alarm.name === 'timerTick') {
                this.updateTimer();
            } 
            // Else If Statement when checking site's time limit
            else if (alarm.name === 'siteTrackingCheck') {
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
        // If Statement to stop the cureent site tracking
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
        // If Statement to check the site time limit
        if (!this.siteTracking.currentSite || !this.siteTracking.startTime) {
            return;
        }
        
        const timeSpent = Date.now() - this.siteTracking.startTime;
        const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
        
        // If Statement to check if user has been on the site for more than 5 minutes
        if (timeSpent > fiveMinutes) {
            console.log(`User has been on ${this.siteTracking.currentSite} for more than 5 minutes`);
            // Try Statement to get the current active tab to send nudge
            try {
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
        // Try and Catch Statment to get the settings of the extension
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
        // Try and Catch Statement for loading the stored data
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
        // Try and Catch Statement when loading the process/state of the timer
        try {
            const result = await chrome.storage.local.get('timerState');
            if (result.timerState) {
                this.timerState = { ...this.timerState, ...result.timerState };
                
                // If Statement when timer is running when extension was closed to calculate elapsed time
                if (this.timerState.isRunning && this.timerState.startTime) {
                    const now = Date.now();
                    const elapsed = Math.floor((now - this.timerState.startTime) / 1000);
                    this.timerState.currentTime = Math.max(0, this.timerState.currentTime - elapsed);
                    // If Statement when the timer is completed
                    if (this.timerState.currentTime <= 0) {
                        this.completeTimer();
                    } 
                    // Else Statement when the timer is not completed
                    else {
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
        // Try Statement to save current timer process
        try {
            await chrome.storage.local.set({ timerState: this.timerState });
        } catch (error) {
            console.error('Error saving timer state:', error);
        }
    }
    
    async updateTimer() {
        // If Statement when updating timer
        if (!this.timerState.isRunning || this.timerState.isPaused) {
            return;
        }
        
        const now = Date.now();
        // If Statement when time is started
        if (this.timerState.startTime) {
            const elapsed = Math.floor((now - this.timerState.startTime) / 1000);
            const newCurrentTime = Math.max(0, this.timerState.originalTime - elapsed);
            // If Statement when the new timer is not the same with the current timer
            if (newCurrentTime !== this.timerState.currentTime) {
                this.timerState.currentTime = newCurrentTime;
                await this.saveTimerState();
                
                // Try and Catch Statement to notify popup if it's open
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
                
                // If Statement when the timer has completed
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
        // If Statement when the timer has the possibility to pause
        if (this.timerState.isRunning && !this.timerState.isPaused) {
            this.timerState.isPaused = true;
            // Calculate remaining time
            const now = Date.now();
            const elapsed = Math.floor((now - this.timerState.startTime) / 1000);
            this.timerState.currentTime = Math.max(0, this.timerState.originalTime - elapsed);
            await this.saveTimerState();
            console.log('Timer paused in background');
        } 
        // Else If Statement when timer is already paused
        else if (this.timerState.isPaused) {
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
        
        // Try and Catch Statement to notify popup if it's open
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
        // Try and Catch Statement
        try {
            const result = await chrome.storage.sync.get('focusStreak');
            const newStreak = (result.focusStreak || 0) + 25;
            await chrome.storage.sync.set({ focusStreak: newStreak });
        } catch (error) {
            console.error('Error updating focus streak:', error);
        }
    }
    
    async checkForDistraction(tab) {
        // Try and Catch Statement
        try {
            const settings = await chrome.storage.sync.get([
                'extensionEnabled',
                'notifications',
                'strictMode'
            ]);
            
            // If Statement to check if extension is enabled
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
            // If Statement when user is distracted
            if (isDistracting) {
                await this.handleDistraction(tab, settings);
            }
            
        } catch (error) {
            console.error('Error checking for distraction:', error);
        }
    }
    
    async handleDistraction(tab, settings) {
        const now = Date.now();
        
        // If statemtent to check cooldown to prevent spam
        if (now - this.lastNotificationTime < this.notificationCooldown) {
            return;
        }
        
        this.lastNotificationTime = now;
        this.blockedToday++;
        
        // Update storage
        await chrome.storage.sync.set({ blockedCount: this.blockedToday });
        
        // If Statement to show notification if enabled
        if (settings.notifications !== false) {
            this.showFocusReminder(tab);
        }
        
        // If Statement when in strict mode to close the tab or redirect
        if (settings.strictMode === true) {
            this.handleStrictMode(tab);
        }
        
        // Try and Catch Statement to send message to popup if it's open
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
            "Time to refocus! Let's get back to work.",
            "Taking a break? Remember your goals!",
            "Stay productive! You've got this!",
            "Focus mode activated. You're stronger than the distraction!",
            "Keep the momentum going!",
            "Your future self will thank you for staying focused.",
            "Every focused minute counts towards your success!",
            "Discipline today, success tomorrow.",
            "You've been here for 5+ minutes! Time to refocus!",
            "5 minutes flew by! Let's get back to productivity!"
        ];
        
        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icon48.png',
            title: 'FocusUp Reminder',
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
        // Try and Catch Statement to update chrome tabs
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
            title: 'Focus Session Complete!',
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
const focusUp = new FocusUpBackground();

// Handle notification button clicks
chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
    // If Statement when 'Stay Focused' button clicked
    if (buttonIndex === 0) {
        chrome.notifications.clear(notificationId);
    // Else If Statement when 5 min break button clicked
    } else if (buttonIndex === 1) {
        chrome.notifications.clear(notificationId);
        
        // Try and Catch Statement to grant temporary access to current site
        try {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs[0] && tabs[0].url) {
                const url = new URL(tabs[0].url);
                const hostname = url.hostname.toLowerCase().replace(/^www\./, '');
                focusUp.grantTemporaryAccess(hostname, 5);
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

console.log('FocusUp background script initialized');