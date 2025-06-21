// Popup functionality for FocusPal
class FocusPalPopup {
    constructor() {
        this.currentTime = 25 * 60; // Default value, will be synced with background
        this.isRunning = false;
        this.isPaused = false;
        this.updateInterval = null;
        
        this.init();
    }
    
    async init() {
        this.bindEvents();
        await this.loadData();
        await this.syncTimerWithBackground();
        this.updateDisplay();
        this.loadRandomQuote();
        this.startUpdateLoop();
    }
    
    bindEvents() {
        // Timer controls
        document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
        document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
        document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());
        
        // Extension controls
        document.getElementById('toggleExtension').addEventListener('click', () => this.toggleExtension());
        document.getElementById('openSettings').addEventListener('click', () => this.toggleSettings());
        
        // Settings toggles
        document.getElementById('notificationsToggle').addEventListener('click', () => this.toggleSetting('notifications'));
        document.getElementById('soundToggle').addEventListener('click', () => this.toggleSetting('sound'));
        document.getElementById('strictModeToggle').addEventListener('click', () => this.toggleSetting('strictMode'));
    }
    
    async syncTimerWithBackground() {
        try {
            const response = await chrome.runtime.sendMessage({ action: 'getTimerState' });
            if (response) {
                this.currentTime = response.currentTime;
                this.isRunning = response.isRunning;
                this.isPaused = response.isPaused;
                this.updateTimerUI();
            }
        } catch (error) {
            console.error('Error syncing timer with background:', error);
        }
    }
    
    startUpdateLoop() {
        // Listen for timer updates from background
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'timerUpdate') {
                this.currentTime = message.currentTime;
                this.isRunning = message.isRunning;
                this.isPaused = message.isPaused;
                this.updateTimerUI();
            } else if (message.action === 'timerCompleted') {
                this.currentTime = message.currentTime;
                this.isRunning = message.isRunning;
                this.isPaused = message.isPaused;
                this.onTimerCompleted();
            } else if (message.action === 'updateBlockedCount') {
                document.getElementById('blockedCount').textContent = message.count;
            }
        });
    }
    
    async loadData() {
        try {
            const result = await chrome.storage.sync.get([
                'blockedCount', 
                'focusStreak', 
                'extensionEnabled',
                'notifications',
                'sound',
                'strictMode'
            ]);
            
            document.getElementById('blockedCount').textContent = result.blockedCount || 0;
            document.getElementById('focusStreak').textContent = `${result.focusStreak || 0} min`;
            
            const status = result.extensionEnabled !== false ? 'Active' : 'Paused';
            document.getElementById('extensionStatus').textContent = status;
            
            const toggleButton = document.getElementById('toggleExtension');
            toggleButton.textContent = result.extensionEnabled !== false ? 'Pause FocusPal' : 'Resume FocusPal';
            
            // Update settings toggles
            this.updateToggle('notificationsToggle', result.notifications !== false);
            this.updateToggle('soundToggle', result.sound === true);
            this.updateToggle('strictModeToggle', result.strictMode === true);
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }
    
    updateToggle(toggleId, isActive) {
        const toggle = document.getElementById(toggleId);
        if (isActive) {
            toggle.classList.add('active');
        } else {
            toggle.classList.remove('active');
        }
    }
    
    async toggleSetting(setting) {
        try {
            const result = await chrome.storage.sync.get(setting);
            const currentValue = result[setting];
            const newValue = !currentValue;
            
            await chrome.storage.sync.set({ [setting]: newValue });
            this.updateToggle(setting + 'Toggle', newValue);
            
            // Notify background script of setting change
            chrome.runtime.sendMessage({ 
                action: 'settingChanged', 
                setting: setting, 
                value: newValue 
            });
            
        } catch (error) {
            console.error('Error toggling setting:', error);
        }
    }
    
    async startTimer() {
        try {
            if (!this.isRunning) {
                await chrome.runtime.sendMessage({ action: 'startTimer' });
                this.isRunning = true;
                this.isPaused = false;
            } else if (this.isPaused) {
                await chrome.runtime.sendMessage({ action: 'pauseTimer' });
                this.isPaused = false;
            }
            this.updateTimerUI();
        } catch (error) {
            console.error('Error starting timer:', error);
        }
    }
    
    async pauseTimer() {
        try {
            if (this.isRunning) {
                await chrome.runtime.sendMessage({ action: 'pauseTimer' });
                this.isPaused = !this.isPaused;
                this.updateTimerUI();
            }
        } catch (error) {
            console.error('Error pausing timer:', error);
        }
    }
    
    async resetTimer() {
        try {
            await chrome.runtime.sendMessage({ action: 'resetTimer' });
            this.isRunning = false;
            this.isPaused = false;
            this.currentTime = 25 * 60;
            this.updateTimerUI();
        } catch (error) {
            console.error('Error resetting timer:', error);
        }
    }
    
    updateTimerUI() {
        // Update timer display
        this.updateTimerDisplay();
        
        // Update button states
        const startButton = document.getElementById('startTimer');
        const timerLabel = document.getElementById('timerLabel');
        
        if (this.isRunning && !this.isPaused) {
            startButton.textContent = 'Running...';
            timerLabel.textContent = 'Focus Time Active';
            startButton.disabled = true;
        } else if (this.isPaused) {
            startButton.textContent = 'Resume';
            timerLabel.textContent = 'Timer Paused';
            startButton.disabled = false;
        } else {
            startButton.textContent = 'Start';
            timerLabel.textContent = 'Pomodoro Timer';
            startButton.disabled = false;
        }
    }
    
    onTimerCompleted() {
        this.updateTimerUI();
        document.getElementById('timerLabel').textContent = '🎉 Focus Session Complete!';
        
        // Update focus streak display
        this.updateFocusStreakDisplay();
        
        // Reset label after a few seconds
        setTimeout(() => {
            document.getElementById('timerLabel').textContent = 'Pomodoro Timer';
        }, 3000);
    }
    
    async updateFocusStreakDisplay() {
        try {
            const result = await chrome.storage.sync.get('focusStreak');
            document.getElementById('focusStreak').textContent = `${result.focusStreak || 0} min`;
        } catch (error) {
            console.error('Error updating focus streak display:', error);
        }
    }
    
    updateTimerDisplay() {
        const minutes = Math.floor(this.currentTime / 60);
        const seconds = this.currentTime % 60;
        const display = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timerDisplay').textContent = display;
    }
    
    updateDisplay() {
        this.updateTimerDisplay();
    }
    
    async toggleExtension() {
        try {
            const result = await chrome.storage.sync.get('extensionEnabled');
            const currentStatus = result.extensionEnabled !== false;
            const newStatus = !currentStatus;
            
            await chrome.storage.sync.set({ extensionEnabled: newStatus });
            
            const statusText = newStatus ? 'Active' : 'Paused';
            const buttonText = newStatus ? 'Pause FocusPal' : 'Resume FocusPal';
            
            document.getElementById('extensionStatus').textContent = statusText;
            document.getElementById('toggleExtension').textContent = buttonText;
            
            // Notify background script
            chrome.runtime.sendMessage({ 
                action: 'extensionToggled', 
                enabled: newStatus 
            });
            
        } catch (error) {
            console.error('Error toggling extension:', error);
        }
    }
    
    toggleSettings() {
        const settingsSection = document.getElementById('settingsSection');
        const button = document.getElementById('openSettings');
        
        if (settingsSection.classList.contains('hidden')) {
            settingsSection.classList.remove('hidden');
            button.textContent = 'Hide Settings';
        } else {
            settingsSection.classList.add('hidden');
            button.textContent = 'Settings';
        }
    }
    
    loadRandomQuote() {
        const quotes = [
            "The way to get started is to quit talking and begin doing. - Walt Disney",
            "Success is not final, failure is not fatal: it is the courage to continue that counts. - Winston Churchill",
            "Don't watch the clock; do what it does. Keep going. - Sam Levenson",
            "The future depends on what you do today. - Mahatma Gandhi",
            "Focus on being productive instead of busy. - Tim Ferriss",
            "You don't have to be great to get started, but you have to get started to be great. - Les Brown",
            "Discipline is choosing between what you want now and what you want most. - Abraham Lincoln",
            "The successful warrior is the average person with laser-like focus. - Bruce Lee",
            "Concentrate all your thoughts upon the work at hand. The sun's rays do not burn until brought to a focus. - Alexander Graham Bell",
            "The key to success is to focus our conscious mind on things we desire not things we fear. - Brian Tracy"
        ];
        
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        document.getElementById('motivationalQuote').textContent = randomQuote;
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new FocusPalPopup();
});