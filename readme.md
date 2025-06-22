## FocusUp - Chrome Extension

A productivity-focused Chrome extension that helps you stay focused by detecting distracting websites and providing gentle nudges to refocus.

## Features

- **Real-time Distraction Detection**: Monitors your browsing and detects when you visit potentially distracting websites
- **Gentle Nudges**: Shows friendly reminders and motivational quotes when distractions are detected
- **Pomodoro Timer**: Built-in 25-minute focus timer with break notifications
- **Daily Statistics**: Track blocked distractions and focus streaks
- **Customizable Settings**: Toggle notifications, sound alerts, and strict mode
- **Strict Mode**: Automatically redirects from distracting sites to a focus page
- **Beautiful UI**: Modern, gradient-based design with smooth animations

## Installation

### For Development/Testing:

1. **Download the Extension Files**
   - Save all the provided files (`manifest.json`, `popup.html`, `popup.js`, `background.js`, `content.js`, `focus.html`) in a single folder

2. **Load Extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the folder containing your extension files
   - The FocusPal extension should now appear in your extensions list

3. **Pin the Extension**
   - Click the puzzle piece icon in Chrome's toolbar
   - Find FocusPal and click the pin icon to keep it visible

## How to Use

### Basic Usage
- **Automatic Detection**: FocusPal runs automatically and monitors your browsing
- **Click Extension Icon**: Access the popup to view stats and controls
- **Start Focus Timer**: Use the built-in Pomodoro timer for structured work sessions

### Settings & Customization
- **Toggle Extension**: Pause/resume FocusPal from the popup
- **Notifications**: Enable/disable browser notifications
- **Sound Alerts**: Toggle audio notifications (requires implementation)
- **Strict Mode**: Automatically redirect from distracting sites

### Distraction Handling
When you visit a distracting site, FocusPal will:
- Show a notification reminder (if enabled)
- Display a focus overlay on the page
- In strict mode: redirect to the focus page
- Track the distraction in your daily stats

## Technical Details

### Permissions Used
- `tabs`: Monitor active tabs and URLs
- `activeTab`: Access current tab information
- `storage`: Save user settings and statistics
- `notifications`: Show focus reminders

### Default Distracting Sites
FocusPal monitors these sites by default:
- Social Media: YouTube, Twitter/X, Facebook, Instagram, TikTok, LinkedIn
- Entertainment: Netflix, Twitch, Pinterest, Discord
- News/Forums: Reddit
- Communication: WhatsApp, Telegram, Snapchat

## Future Enhancements

Potential features to add:
- **AI-Powered Quotes**: Integration with OpenAI API for personalized motivation
- **Custom Site Management**: UI for adding/removing distracting sites
- **Focus Analytics**: Detailed productivity reports and trends
- **Website Blocking**: Complete blocking instead of just notifications
- **Team Features**: Share focus goals with friends or colleagues
- **Integration**: Connect with productivity apps like Todoist, Notion

## License

This project is open source and available under the MIT License.

## Contributing

Feel free to submit issues, feature requests, or pull requests to improve FocusPal!

---

**Happy Focusing!**