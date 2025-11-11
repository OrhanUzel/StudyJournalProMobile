# Study Journal Pro Mobile <a href="https://play.google.com/store/apps/details?id=com.studyjournalpromobile" title="Open on Google Play"><img src="assets/app-icon.png" alt="Study Journal Pro App Icon" width="64" /></a>

A modern, beautiful, and well-structured mobile app built with React Native (Expo) to help users track their study sessions, take notes, and view progress statistics.

## Google Play

- Download on Google Play: https://play.google.com/store/apps/details?id=com.studyjournalpromobile

## Features

- **Dark/Light Theme** - Toggle between dark and light mode
- **Study Notes** - Create and manage study notes with duration tracking
- **Statistics** - View your study progress with beautiful charts
- **Local Storage** - All data is stored locally on your device

## Screenshots

In‑app screenshots are under `assets/screenshots/`. Listed with titles and short descriptions:

### Home (Study Journal)
- Main screen with study logs, recent notes, and navigation.
<img src="assets/screenshots/study-journal.jpg" alt="Home (Study Journal)" width="320" />

### Stopwatch
- Start/stop session timing; record laps; focus‑friendly timer.
<img src="assets/screenshots/stopwatch.jpg" alt="Stopwatch" width="320" />

### Record Detail
- Details of a single study entry: duration, notes, and edit options.
<img src="assets/screenshots/record-detail.jpg" alt="Record Detail" width="320" />

### Statistics Choice
- Picker to choose the metrics/filters you want to visualize.
<img src="assets/screenshots/statistics-choice.jpg" alt="Statistics Choice" width="320" />

### Statistics
- Charts displaying your study progress.
<img src="assets/screenshots/statistics.jpg" alt="Statistics" width="320" />

### Settings
- Theme (dark/light), remove/restore ads, and app preferences.
<img src="assets/screenshots/settings.jpg" alt="Settings" width="320" />

### About
- App version, developer links, and references.
<img src="assets/screenshots/about.jpg" alt="About" width="320" />

## Project Structure

```
StudyJournalProMobile/
├── App.js                 # Main application entry point
├── src/                   # Source code directory
│   ├── screens/           # App screens
│   │   ├── HomeScreen.js
│   │   ├── AddNoteScreen.js
│   │   ├── StatisticsScreen.js
│   │   ├── SettingsScreen.js
│   ├── components/        # Reusable UI components
│   │   ├── NoteCard.js
│   │   ├── AddButton.js
│   │   ├── ChartCard.js
│   │   ├── AnimatedCard.js
│   ├── context/           # React Context providers
│   │   ├── NotesContext.js
│   │   ├── ThemeContext.js
│   ├── theme/             # Theme configuration
│   │   ├── theme.js
│   └── utils/             # Utility functions
│       ├── storage.js
```

## Installation

1. Make sure you have Node.js and npm installed
2. Install Expo CLI globally:
   ```
   npm install -g expo-cli
   ```
3. Install project dependencies:
   ```
   npm install
   ```
4. Install required dependencies:
   ```
   npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
   npx expo install react-native-gesture-handler react-native-reanimated react-native-screens
   npx expo install react-native-safe-area-context @react-native-async-storage/async-storage
   npx expo install react-native-chart-kit react-native-svg expo-status-bar
   ```

## Running the App

1. Start the development server:
   ```
   npx expo start
   ```
2. Use Expo Go app on your mobile device to scan the QR code displayed in the terminal
3. Alternatively, press 'a' to run on an Android emulator or 'i' to run on an iOS simulator

## Usage

- **Home Screen**: View your study notes and add new ones
- **Add Note Screen**: Create new study notes with title, content, and duration
- **Statistics Screen**: View charts of your study progress
- **Settings Screen**: Toggle dark/light theme and manage app data

## Technologies Used

- React Native (Expo)
- React Navigation
- AsyncStorage
- React Native Chart Kit
- Animated API for smooth transitions

## License

MIT