# 🏃 Rehabify - Gamified Rehabilitation

An AI-powered rehabilitation platform that makes physical therapy engaging through gamification and real-time pose detection.

## ✨ Recent Improvements

### 🎨 **Enhanced Cohesiveness**
- **Modern UI Design**: Gradient backgrounds, smooth animations, and consistent styling
- **Professional Branding**: Updated title, logo, and cohesive color scheme
- **Improved Layout**: Better visual hierarchy and responsive design
- **Animated Elements**: Floating mascot, hover effects, and smooth transitions

### 🎯 **Clear Level Differentiation**
- **Level-Specific Colors**: 
  - Level 1: Blue (`#7ee1ff`) - Upper body exercises
  - Level 2: Orange (`#ff9f43`) - Lower body exercises
  - Level 3: Purple (`#6c5ce7`) - Advanced exercises
- **Dynamic Level Tags**: Visual indicators that change color based on current level
- **Progressive Difficulty**: Clear exercise progression from basic to advanced
- **Level Transition Effects**: Animated breaks between levels

### 🤖 **Stick Figure Demonstrations**
- **Exercise-Specific Animations**: Different animations for each exercise type
  - Overhead Press: Arms moving up and down
  - Forward Reach: Alternating arm movements
  - Shoulder Abduction: Rainbow pattern movements
- **Real-time Animation**: Smooth 20fps animations in the dedicated demo panel
- **Visual Learning**: Clear movement patterns to help users understand exercises

### ⚡ **Performance Optimizations**
- **Reduced Frame Rate**: Lowered to 10fps in performance mode for smoother experience
- **Optimized Rendering**: Frame skipping and reduced visual effects
- **Lighter MediaPipe Model**: Using complexity level 0 for better performance
- **Efficient Canvas Operations**: Disabled shadows and reduced particles in low-performance mode
- **Smart Updates**: Only update animations when necessary

## 🏗️ **Project Structure**

```
rehabifyyyy/
├── public/
│   ├── index.html              # Main application page
│   ├── style.css              # Enhanced styles with animations
│   ├── script.js              # Main application logic (optimized)
│   ├── criteria.js            # Exercise criteria and detection
│   ├── exercises.js           # Exercise definitions
│   ├── shoulder_abduction.js  # Shoulder exercise configuration
│   ├── front_reach.js        # Forward reach exercise
│   ├── overhead_press.js     # Overhead press exercise
│   ├── lower_dummy_1.js      # Lower body demo 1
│   └── lower_dummy_2.js      # Lower body demo 2
├── server.js                  # Express server
├── package.json              # Dependencies
└── README.md                 # This file
```

## 🚀 **Getting Started**

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Start the Server**:
   ```bash
   npm start
   ```

3. **Open Your Browser**:
   Navigate to `http://localhost:3000`

4. **Grant Camera Access**:
   Allow camera permissions when prompted

## 🎮 **How to Use**

1. **Position Yourself**: Make sure your upper body (or full body for lower exercises) is visible
2. **Click Start**: Begin the rehabilitation session
3. **Follow Instructions**: Watch the stick figure demo and follow the on-screen guidance
4. **Complete Exercises**: Perform the movements as shown
5. **Track Progress**: Monitor your score, streak, and stars earned

## 🎯 **Exercise Types**

### Level 1 - Upper Body
- **Forward Reach**: Alternating forward arm reaches
- **Overhead Press**: Both arms pressing overhead

### Level 2 - Lower Body  
- **Sit-to-Stand**: Practice sitting and standing movements
- **March in Place**: Timed marching exercise

## 🛠️ **Technical Features**

- **Real-time Pose Detection**: Using MediaPipe for accurate body tracking
- **AI Coaching**: Intelligent feedback and form correction
- **Gamification**: Points, streaks, and star collection system
- **Responsive Design**: Works on desktop and mobile devices
- **Performance Optimized**: Smooth experience even on lower-end devices

## 🔧 **Configuration**

Performance settings can be adjusted in `script.js`:

```javascript
const PERF = { 
  LOW: true,                    // Enable performance mode
  SKIP_FRAMES: 2,              // Frame skipping for better performance
  REDUCE_QUALITY: true,        // Reduce visual quality
  DISABLE_SHADOWS: true        // Disable shadow effects
};
```

## 🎨 **Customization**

Colors and animations can be customized in `style.css` using CSS variables:

```css
:root {
  --level1-color: #7ee1ff;     /* Level 1 color */
  --level2-color: #ff9f43;     /* Level 2 color */
  --level3-color: #6c5ce7;     /* Level 3 color */
  /* ... more variables */
}
```

## 🤝 **Contributing**

Feel free to contribute to this project by:
- Adding new exercises
- Improving the UI/UX
- Optimizing performance
- Adding new features

## 📄 **License**

This project is open source. Feel free to use and modify as needed.

---

Made with ❤️ for better rehabilitation experiences
