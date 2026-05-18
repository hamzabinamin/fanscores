# FanScores

A modern, high-performance sports fixture management and live score tracking mobile application built with React Native, Expo Router, and TypeScript. FanScores allows sports administrators and enthusiasts to cleanly create fixtures, filter live games by sport or gender profiles, and manage teams seamlessly across both dark and light modes.

---

## 📱 Features

- **Dynamic Theme Engine**: Full system-wide support for **Dark Mode** and **Light Mode** powered by React Context and memory-optimized design tokens.
- **Fixture Creation & Management**: Comprehensive, grid-aligned match creator supporting multi-tiered attribute selections (Sport, Gender, Level, and Type clusters).
- **Interactive Team Management**: Real-time state-driven modal views that transition smoothly between listing available clubs and triggering live, inline team-card editing configurations.
- **Advanced Target Filtering**: Fast, responsive chip-based multi-tag selection arrays to filter local matches instantly by sports category or gender divisions.
- **Robust Routing Tree**: Built natively atop the **Expo Router API**, leveraging optimized directory-based deep link routing handles (`(tabs)`, `(auth)`).

---

## 🛠️ Tech Stack & Dependencies

- **Framework**: [React Native](https://reactnative.dev/) with [Expo (SDK 51+)](https://expo.dev/)
- **Navigation Engine**: [Expo Router v3](https://docs.expo.dev/router/introduction/) (File-system based router)
- **Language**: [TypeScript](https://www.typescript.org/) (Strictly typed layout and components)
- **Icons Asset Pipeline**: [@expo/vector-icons (Ionicons)](https://docs.expo.dev/guides/icons/)
- **Safe Area Rendering**: [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context)

---

## 📂 Project Directory Layout

```text
src/
├── app/                  # Main Expo Router Application Tree
│   ├── (auth)/           # Authentication Routing Layer
│   │   ├── _layout.tsx   # Auth Stack Navigator Configuration
│   │   ├── login.tsx     # OTP Request and Sign-In Screen
│   │   └── signup.tsx    # User Creation Dashboard
│   ├── (tabs)/           # Core Application App Tab Layer
│   │   ├── _layout.tsx   # Tab Bar Controller & Theme Mapping
│   │   ├── index.tsx     # Home Screen View (Fixtures Ticker)
│   │   ├── add-game.tsx  # Create Fixture Control Panel
│   │   ├── filters.tsx   # Match Query Tag Filters
│   │   └── more.tsx      # System Controls & Overlay Form Modals
│   └── _layout.tsx       # Root Engine Entry Point & Context Providers
├── components/           # Reusable Component Infrastructure
│   └── GlobalHeader.tsx  # Dynamic Navigation Bar & Country Selector
└── context/              # Global Application Architecture State
    └── ThemeContext.tsx  # Context API Provider & Design Tokens Layout