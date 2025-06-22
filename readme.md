# FocusUp - Chrome Extension

**FocusUp** is a productivity-focused Chrome extension that helps you stay on track by detecting distracting websites and providing gentle nudges to refocus.

---

## 🚀 Features

- **🔍 Real-time Distraction Detection**  
  Monitors your browsing activity and detects visits to potentially distracting websites.

- **💬 Gentle Nudges**  
  Displays friendly reminders and motivational quotes when distractions are detected.

- **⏱️ Pomodoro Timer**  
  Built-in 25-minute focus timer with break notifications to promote structured work sessions.

- **📊 Daily Statistics**  
  Tracks distractions blocked and logs your daily focus streaks.

- **⚙️ Customizable Settings**  
  Toggle notifications, sound alerts, and enable/disable strict mode.

- **🚫 Strict Mode**  
  Automatically redirects you from distracting sites to a focus-friendly page.

- **🎨 Beautiful UI**  
  Sleek, gradient-based modern design with smooth animations and intuitive layout.

---

## 🧩 Installation

### Development / Testing

1. **Download the Extension Files**  
   Save all files (`manifest.json`, `popup.html`, `popup.js`, `background.js`, `content.js`, `focus.html`) in a single folder.

2. **Load the Extension in Chrome**  
   - Open Chrome and go to `chrome://extensions/`  
   - Enable **Developer mode** (top right toggle)  
   - Click **Load unpacked**  
   - Select the folder containing your extension files  
   - **FocusUp** should now appear in your extensions list

3. **Pin the Extension**  
   - Click the puzzle piece icon in Chrome’s toolbar  
   - Find **FocusUp** and click the pin icon to keep it visible

---

## 💡 How to Use

### Basic Usage

- **Automatic Monitoring**  
  FocusUp runs automatically and monitors your browsing in the background.

- **Access the Popup**  
  Click the extension icon to view statistics and use the Pomodoro timer.

- **Start a Focus Session**  
  Use the Pomodoro timer to structure your productivity with breaks.

### Settings & Customization

- **Toggle Monitoring**  
  Pause or resume FocusUp from the popup.

- **Browser Notifications**  
  Enable/disable visual reminders when visiting distracting sites.

- **Sound Alerts** *(planned)*  
  Toggle audio reminders to enhance awareness.

- **Strict Mode**  
  Instantly redirects from distracting sites to a dedicated focus page.

### Distraction Handling

When you visit a distracting site, FocusUp may:

- Show a motivational quote or reminder (if notifications are enabled)  
- Overlay a focus message directly on the page  
- Redirect you to a focus page (in strict mode)  
- Log the event in your daily statistics

---

## 🔐 Technical Details

### Permissions Used

- `tabs`: Detect and monitor active website URLs  
- `activeTab`: Access information about the currently open tab  
- `storage`: Store user settings and usage data  
- `notifications`: Display focus-related reminders

### Default Distracting Sites

FocusUp monitors these sites by default (editable in future updates):

- **Social Media**: YouTube, Twitter/X, Facebook, Instagram, TikTok, LinkedIn  
- **Entertainment**: Netflix, Twitch, Pinterest, Discord  
- **News/Forums**: Reddit  
- **Messaging**: WhatsApp, Telegram, Snapchat

---

## 🔮 Future Enhancements

Some planned and possible future features:

- **AI-Powered Quotes**: Use OpenAI to generate personalized motivation  
- **Custom Distraction List**: Add or remove distracting sites in a settings panel  
- **Productivity Analytics**: Visual charts and insights about your focus habits  
- **Full Site Blocking**: Not just redirection—complete block options  
- **Team Mode**: Set and share focus goals with friends or coworkers  
- **App Integrations**: Sync with Todoist, Notion, Trello, and others

---

## 📄 License

This project is open-source under the **MIT License**.  
Feel free to use, modify, and distribute it responsibly.

---

## 🤝 Contributing

Have an idea or found a bug?  
Submit an issue or open a pull request—we welcome contributions!

---

**Happy Focusing with FocusUp! 🚀**