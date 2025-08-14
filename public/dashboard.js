// dashboard.js
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    loadDashboardData();
    setupEventListeners();
    animateStats();
    generateCandyCalendar();
    updateStreakDisplay();
}

function loadDashboardData() {
    // Get stored session data
    const lastSession = JSON.parse(localStorage.getItem('lastSession') || '{}');
    const sessionStats = JSON.parse(localStorage.getItem('sessionStats') || '{}');
    
    // Calculate cumulative stats (in a real app, this would be stored persistently)
    const totalExercises = (lastSession.stats?.exercisesCompleted || 0) + (sessionStats.exercisesCompleted || 0);
    const totalStars = (lastSession.stats?.starsEarned || 0) + (sessionStats.starCount || 0);
    const bestStreak = Math.max(lastSession.stats?.maxStreak || 0, sessionStats.streak || 0);
    const currentLevel = Math.max(lastSession.level || 1, localStorage.getItem('currentLevel') || 1);
    
    // Update stats display
    document.getElementById('totalExercises').textContent = totalExercises;
    document.getElementById('totalStars').textContent = totalStars;
    document.getElementById('bestStreak').textContent = bestStreak;
    document.getElementById('currentLevel').textContent = currentLevel;
    
    // Load and display mood data
    loadMoodData();
    
    // Update recent session info
    if (lastSession.completedAt || sessionStats.completedAt) {
        const sessionDate = new Date(lastSession.completedAt || sessionStats.completedAt);
        document.getElementById('sessionDate').textContent = formatDate(sessionDate);
        document.getElementById('sessionLevel').textContent = `Level ${lastSession.level || currentLevel} Completed`;
        document.getElementById('sessionDetails').textContent = `Completed ${lastSession.stats?.exercisesCompleted || sessionStats.exercisesCompleted || 0} exercises with ${lastSession.stats?.starsEarned || sessionStats.starCount || 0} stars!`;
    }
}

function formatDate(date) {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString();
    }
}

function animateStats() {
    // Animate the stat numbers with a counting effect
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach((element, index) => {
        const finalValue = parseInt(element.textContent);
        if (finalValue === 0) return;
        
        element.textContent = '0';
        
        setTimeout(() => {
            animateNumber(element, 0, finalValue, 1000);
        }, index * 200);
    });
}

function animateNumber(element, start, end, duration) {
    const startTime = performance.now();
    
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function for smooth animation
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const currentValue = Math.floor(start + (end - start) * easeOutQuart);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            element.textContent = end;
        }
    }
    
    requestAnimationFrame(update);
}

function loadMoodData() {
    // Get the last feedback data
    const lastFeedback = JSON.parse(localStorage.getItem('lastFeedback') || '{}');
    
    if (lastFeedback.feeling) {
        const moodData = getMoodInfo(lastFeedback.feeling);
        document.getElementById('moodIcon').textContent = moodData.emoji;
        document.getElementById('lastMood').textContent = moodData.label;
    }
    
    // Generate and display weekly mood chart
    createMoodChart();
}

function getMoodInfo(feelingValue) {
    const moodMap = {
        '1': { emoji: '😫', label: 'Very Difficult' },
        '2': { emoji: '😰', label: 'Challenging' },
        '3': { emoji: '😐', label: 'Moderate' },
        '4': { emoji: '😊', label: 'Good' },
        '5': { emoji: '😄', label: 'Great!' }
    };
    return moodMap[feelingValue] || { emoji: '😊', label: 'Good' };
}

function createMoodChart() {
    const chartContainer = document.getElementById('moodChart');
    
    // Generate fake weekly mood data (in a real app, this would be from stored feedback)
    const weeklyMoods = generateWeeklyMoodData();
    
    const chartHTML = `
        <div class="mood-chart-header">
            <h4>Past 7 Days</h4>
            <div class="mood-legend">
                <div class="legend-item"><span class="legend-color mood-bad"></span> Difficult</div>
                <div class="legend-item"><span class="legend-color mood-good"></span> Great</div>
            </div>
        </div>
        <div class="mood-bars-container">
            ${weeklyMoods.map((day, index) => `
                <div class="mood-bar-wrapper">
                    <div class="mood-bar" style="height: ${day.value * 20}%">
                        <div class="mood-emoji">${getMoodInfo(day.value.toString()).emoji}</div>
                    </div>
                    <div class="mood-day-label">${day.label}</div>
                </div>
            `).join('')}
        </div>
        <div class="mood-summary">
            <div class="mood-average">
                <span class="avg-label">Weekly Average:</span>
                <span class="avg-value">${getMoodInfo(Math.round(weeklyMoods.reduce((sum, day) => sum + day.value, 0) / weeklyMoods.length).toString()).emoji} ${getMoodInfo(Math.round(weeklyMoods.reduce((sum, day) => sum + day.value, 0) / weeklyMoods.length).toString()).label}</span>
            </div>
        </div>
    `;
    
    chartContainer.innerHTML = chartHTML;
    
    // Animate bars
    setTimeout(() => {
        document.querySelectorAll('.mood-bar').forEach((bar, index) => {
            setTimeout(() => {
                bar.style.opacity = '1';
                bar.style.transform = 'scaleY(1)';
            }, index * 100);
        });
    }, 100);
}

function generateWeeklyMoodData() {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const lastFeedback = JSON.parse(localStorage.getItem('lastFeedback') || '{}');
    
    return days.map((day, index) => {
        let moodValue;
        if (index === days.length - 1 && lastFeedback.feeling) {
            // Use actual feedback for today/most recent day
            moodValue = parseInt(lastFeedback.feeling);
        } else {
            // Generate realistic fake data showing improvement trend
            const baseValue = 2.5 + (index * 0.3); // Gradual improvement
            const randomVariation = (Math.random() - 0.5) * 0.8;
            moodValue = Math.max(1, Math.min(5, Math.round(baseValue + randomVariation)));
        }
        
        return {
            label: day,
            value: moodValue
        };
    });
}

function setupEventListeners() {
    const viewProgressBtn = document.getElementById('viewProgress');
    
    // Add program card click handlers
    const programCards = document.querySelectorAll('.program-card');
    programCards.forEach(card => {
        card.addEventListener('click', function() {
            const program = this.getAttribute('data-program');
            
            if (this.classList.contains('coming-soon')) {
                // Show coming soon message
                showComingSoonModal(program);
                return;
            }
            
            // Add loading state
            this.classList.add('loading');
            
            // Clear any previous session data to start fresh
            localStorage.removeItem('sessionStats');
            
            // Redirect to exercise platform
            setTimeout(() => {
                window.location.href = `/index.html?program=${program}`;
            }, 500);
        });
    });
    
    // Add calendar day click handlers
    setupCalendarListeners();
    
    viewProgressBtn.addEventListener('click', function() {
        // In a real app, this would show detailed progress charts
        showProgressModal();
    });
}

function showProgressModal() {
    const modal = document.createElement('div');
    modal.className = 'progress-modal-overlay';
    modal.innerHTML = `
        <div class="progress-modal">
            <div class="modal-header">
                <h3>📊 Detailed Progress</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="progress-info">
                    <h4>Your Rehabilitation Journey</h4>
                    <p>Here's a detailed look at your progress:</p>
                    
                    <div class="progress-metrics">
                        <div class="metric">
                            <div class="metric-label">Consistency</div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: 85%"></div>
                            </div>
                            <div class="metric-value">85%</div>
                        </div>
                        
                        <div class="metric">
                            <div class="metric-label">Form Quality</div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: 92%"></div>
                            </div>
                            <div class="metric-value">92%</div>
                        </div>
                        
                        <div class="metric">
                            <div class="metric-label">Improvement</div>
                            <div class="metric-bar">
                                <div class="metric-fill" style="width: 78%"></div>
                            </div>
                            <div class="metric-value">78%</div>
                        </div>
                    </div>
                    
                    <div class="achievements">
                        <h4>Recent Achievements 🏆</h4>
                        <div class="achievement-list">
                            <div class="achievement">✨ Completed Level 1</div>
                            <div class="achievement">🔥 5-day streak</div>
                            <div class="achievement">⭐ Earned 100+ stars</div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="modal-footer">
                <button class="close-progress-modal primary-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Close handlers
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.querySelector('.close-progress-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function showComingSoonModal(dayNumber) {
    const modal = document.createElement('div');
    modal.className = 'progress-modal-overlay';
    modal.innerHTML = `
        <div class="progress-modal">
            <div class="modal-header">
                <h3>🚧 Coming Soon!</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="progress-info">
                    <h4>Day ${dayNumber} Program</h4>
                    <p>We're working hard to bring you more rehabilitation programs! Day ${dayNumber} will be available soon with new exercises and challenges.</p>
                    
                    <div class="coming-soon-features">
                        <h4>🎯 What's Coming</h4>
                        <div class="feature-list">
                            <div class="feature">📈 Advanced difficulty levels</div>
                            <div class="feature">💪 New exercise types</div>
                            <div class="feature">🏆 Enhanced progress tracking</div>
                        </div>
                    </div>
                    
                    <p><strong>For now, enjoy perfecting Day 1!</strong> Master those upper body movements and build your foundation.</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="close-progress-modal primary-btn">Got It!</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Close handlers
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.querySelector('.close-progress-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

// Add dashboard-specific styles
const dashboardStyles = `
    .dashboard-content {
        max-width: 1000px;
        margin: 0 auto;
        padding: 20px;
    }
    
    .welcome-section {
        text-align: center;
        margin-bottom: 40px;
    }
    
    .welcome-section h2 {
        color: var(--accent);
        font-size: 2rem;
        margin: 0 0 10px 0;
    }
    
    .welcome-section p {
        color: var(--muted);
        font-size: 1.1rem;
        margin: 0;
    }
    
    .stats-overview {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 40px;
    }
    
    .stat-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 16px;
        transition: all var(--transition-fast);
        cursor: pointer;
    }
    
    .stat-card:hover {
        border-color: var(--accent);
        box-shadow: 0 4px 15px rgba(126, 225, 255, 0.1);
        transform: translateY(-2px);
    }
    
    .stat-icon {
        font-size: 2.5rem;
    }
    
    .stat-number {
        font-size: 2rem;
        font-weight: 800;
        color: var(--accent);
        margin-bottom: 4px;
    }
    
    .stat-label {
        color: var(--muted);
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .recent-session {
        margin-bottom: 40px;
    }
    
    .recent-session h3 {
        color: var(--ink);
        margin: 0 0 16px 0;
        font-size: 1.4rem;
    }
    
    .session-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
    }
    
    .session-date {
        color: var(--accent);
        font-weight: 600;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 8px;
    }
    
    .session-level {
        color: var(--ink);
        font-size: 1.2rem;
        font-weight: 600;
        margin-bottom: 4px;
    }
    
    .session-details {
        color: var(--muted);
        font-size: 1rem;
    }
    
    .actions-section {
        display: flex;
        gap: 16px;
        justify-content: center;
        margin-bottom: 40px;
        flex-wrap: wrap;
    }
    
    .primary-btn {
        background: linear-gradient(135deg, var(--accent), #9f7aea);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 16px 24px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all var(--transition-fast);
        box-shadow: 0 4px 15px rgba(126, 225, 255, 0.3);
        min-width: 180px;
        justify-content: center;
    }
    
    .primary-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(126, 225, 255, 0.4);
    }
    
    .primary-btn.loading {
        opacity: 0.8;
        transform: none;
    }
    
    .secondary-btn {
        background: transparent;
        color: var(--muted);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 16px 24px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all var(--transition-fast);
        min-width: 180px;
        justify-content: center;
    }
    
    .secondary-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
    
    .motivational-message {
        background: linear-gradient(135deg, rgba(126, 225, 255, 0.1), rgba(159, 122, 234, 0.1));
        border: 1px solid var(--accent);
        border-radius: 16px;
        padding: 24px;
        display: flex;
        align-items: center;
        gap: 20px;
        text-align: left;
    }
    
    .message-icon {
        font-size: 3rem;
        flex-shrink: 0;
    }
    
    .message-text h4 {
        color: var(--accent);
        margin: 0 0 8px 0;
        font-size: 1.3rem;
    }
    
    .message-text p {
        color: var(--ink);
        margin: 0;
        line-height: 1.5;
    }
    
    .progress-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.3s ease;
    }
    
    .progress-modal-overlay.show {
        opacity: 1;
    }
    
    .progress-modal {
        background: var(--card);
        border: 2px solid var(--border);
        border-radius: 20px;
        max-width: 500px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .progress-modal-overlay.show .progress-modal {
        transform: scale(1);
    }
    
    .modal-header {
        padding: 24px 24px 0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid var(--border);
        margin-bottom: 24px;
    }
    
    .modal-header h3 {
        color: var(--accent);
        margin: 0;
        font-size: 1.4rem;
    }
    
    .close-modal {
        background: none;
        border: none;
        color: var(--muted);
        font-size: 1.5rem;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.3s ease;
    }
    
    .close-modal:hover {
        color: var(--accent);
    }
    
    .modal-body {
        padding: 0 24px 24px;
    }
    
    .progress-metrics {
        margin: 20px 0;
    }
    
    .metric {
        margin-bottom: 16px;
    }
    
    .metric-label {
        color: var(--ink);
        font-weight: 600;
        margin-bottom: 8px;
        display: flex;
        justify-content: space-between;
    }
    
    .metric-bar {
        background: var(--border);
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
    }
    
    .metric-fill {
        background: linear-gradient(90deg, var(--accent), #9f7aea);
        height: 100%;
        border-radius: 4px;
        transition: width 0.8s ease;
    }
    
    .metric-value {
        color: var(--accent);
        font-weight: 600;
        text-align: right;
        font-size: 0.9rem;
    }
    
    .achievements {
        margin-top: 24px;
    }
    
    .achievements h4 {
        color: var(--accent);
        margin: 0 0 12px 0;
    }
    
    .achievement-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .achievement {
        color: var(--ink);
        padding: 8px 12px;
        background: rgba(126, 225, 255, 0.1);
        border-radius: 8px;
        font-weight: 500;
    }
    
    .modal-footer {
        padding: 0 24px 24px;
        text-align: center;
    }
    
    .mood-progress-section {
        margin-bottom: 40px;
    }
    
    .mood-progress-section h3 {
        color: var(--ink);
        margin: 0 0 16px 0;
        font-size: 1.4rem;
    }
    
    .mood-chart-card {
        background: var(--card);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 24px;
    }
    
    .mood-chart-container {
        min-height: 200px;
    }
    
    .loading-chart {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 200px;
        color: var(--muted);
        font-size: 1rem;
    }
    
    .mood-chart-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 10px;
    }
    
    .mood-chart-header h4 {
        color: var(--accent);
        margin: 0;
        font-size: 1.1rem;
    }
    
    .mood-legend {
        display: flex;
        gap: 20px;
    }
    
    .legend-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--muted);
        font-size: 0.9rem;
    }
    
    .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }
    
    .legend-color.mood-bad {
        background: linear-gradient(135deg, #ff6b6b, #ffd93d);
    }
    
    .legend-color.mood-good {
        background: linear-gradient(135deg, var(--accent), #9f7aea);
    }
    
    .mood-bars-container {
        display: flex;
        align-items: end;
        justify-content: space-between;
        gap: 8px;
        height: 120px;
        margin: 20px 0;
        padding: 0 10px;
    }
    
    .mood-bar-wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        flex: 1;
    }
    
    .mood-bar {
        width: 100%;
        max-width: 40px;
        background: linear-gradient(135deg, var(--accent), #9f7aea);
        border-radius: 6px 6px 0 0;
        display: flex;
        align-items: end;
        justify-content: center;
        padding: 8px 4px 4px 4px;
        opacity: 0;
        transform: scaleY(0);
        transform-origin: bottom;
        transition: all 0.5s ease;
        position: relative;
        min-height: 30px;
    }
    
    .mood-emoji {
        font-size: 16px;
        line-height: 1;
    }
    
    .mood-day-label {
        color: var(--muted);
        font-size: 0.8rem;
        font-weight: 500;
        margin-top: 8px;
        text-align: center;
    }
    
    .mood-summary {
        border-top: 1px solid var(--border);
        padding-top: 16px;
        margin-top: 20px;
    }
    
    .mood-average {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
    }
    
    .avg-label {
        color: var(--muted);
        font-weight: 500;
    }
    
    .avg-value {
        color: var(--accent);
        font-weight: 600;
        font-size: 1.1rem;
    }
    
    .days-section {
        margin-bottom: 40px;
    }
    
    .days-section h3 {
        color: var(--ink);
        margin: 0 0 20px 0;
        font-size: 1.4rem;
        text-align: center;
    }
    
    .days-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
    }
    
    .day-card {
        background: var(--card);
        border: 2px solid var(--border);
        border-radius: 16px;
        padding: 24px;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
    }
    
    .day-card:hover {
        border-color: var(--accent);
        box-shadow: 0 8px 25px rgba(126, 225, 255, 0.15);
        transform: translateY(-4px);
    }
    
    .day-card.coming-soon {
        opacity: 0.6;
        cursor: pointer;
    }
    
    .day-card.coming-soon:hover {
        border-color: var(--muted);
        box-shadow: 0 4px 15px rgba(166, 176, 194, 0.1);
    }
    
    .day-card.loading {
        opacity: 0.7;
        transform: scale(0.98);
    }
    
    .day-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--accent), #9f7aea);
        color: white;
        font-size: 1.8rem;
        font-weight: 800;
        margin-bottom: 16px;
    }
    
    .day-card.coming-soon .day-number {
        background: linear-gradient(135deg, var(--muted), #a1b0c2);
    }
    
    .day-title {
        font-size: 1.3rem;
        font-weight: 700;
        color: var(--ink);
        margin-bottom: 8px;
    }
    
    .day-description {
        color: var(--muted);
        font-size: 1rem;
        margin-bottom: 12px;
        line-height: 1.4;
    }
    
    .day-levels {
        color: var(--accent);
        font-size: 0.9rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }
    
    .day-card.coming-soon .day-levels {
        color: var(--muted);
    }
    
    .coming-soon-features {
        margin: 20px 0;
    }
    
    .coming-soon-features h4 {
        color: var(--accent);
        margin: 0 0 12px 0;
        font-size: 1.1rem;
    }
    
    .feature-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }
    
    .feature {
        color: var(--ink);
        padding: 8px 12px;
        background: rgba(126, 225, 255, 0.05);
        border-radius: 8px;
        font-weight: 500;
        border-left: 3px solid var(--accent);
    }
    
    @media (max-width: 600px) {
        .actions-section {
            flex-direction: column;
            align-items: center;
        }
        
        .primary-btn, .secondary-btn {
            width: 100%;
            max-width: 280px;
        }
        
        .motivational-message {
            flex-direction: column;
            text-align: center;
        }
        
        .stats-overview {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        }
        
        .stat-card {
            padding: 16px;
        }
    }
`;

// Add styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = dashboardStyles;
document.head.appendChild(styleSheet);

// ==============================
// CANDY CRUSH CALENDAR FUNCTIONS
// ==============================

function generateCandyCalendar() {
    const calendarContainer = document.getElementById('candyCalendar');
    const monthYearElement = document.getElementById('currentMonth');
    
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    // Update month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearElement.textContent = `${monthNames[month]} ${year}`;
    
    // Get calendar data
    const calendarData = generateCalendarData(year, month);
    
    // Generate calendar HTML
    let calendarHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        calendarHTML += `<div class="calendar-day header">${day}</div>`;
    });
    
    // Add calendar days
    calendarData.forEach(dayData => {
        const classes = ['calendar-day'];
        if (dayData.isOtherMonth) classes.push('other-month');
        if (dayData.isToday) classes.push('today');
        if (dayData.status === 'completed') classes.push('completed');
        if (dayData.status === 'partial') classes.push('partial');
        if (dayData.status === 'missed') classes.push('missed');
        if (dayData.status === 'future') classes.push('future');
        
        calendarHTML += `
            <div class="${classes.join(' ')}" data-date="${dayData.date}">
                <div class="calendar-day-number">${dayData.day}</div>
                <div class="calendar-day-status">${dayData.statusIcon}</div>
            </div>
        `;
    });
    
    calendarContainer.innerHTML = calendarHTML;
    
    // Add animation
    setTimeout(() => {
        const calendarDays = document.querySelectorAll('.calendar-day:not(.header)');
        calendarDays.forEach((day, index) => {
            setTimeout(() => {
                day.style.opacity = '1';
                day.style.transform = 'scale(1)';
            }, index * 50);
        });
    }, 100);
}

function generateCalendarData(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    
    const calendarData = [];
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Get daily progress data
    const dailyProgress = getDailyProgressData();
    
    // Add previous month's trailing days
    const prevMonth = new Date(year, month - 1, 0);
    const prevMonthDays = prevMonth.getDate();
    
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
        const day = prevMonthDays - i;
        calendarData.push({
            day: day,
            date: `${year}-${month}-${day}`,
            isOtherMonth: true,
            isToday: false,
            status: 'other-month',
            statusIcon: ''
        });
    }
    
    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month, day);
        const dateString = `${year}-${month + 1}-${day}`;
        const isToday = currentDate.toDateString() === today.toDateString();
        const isFuture = currentDate > today;
        
        let status = 'future';
        let statusIcon = '';
        
        if (!isFuture || isToday) {
            const progress = dailyProgress[dateString];
            if (progress) {
                if (progress.completed) {
                    status = 'completed';
                    statusIcon = '🏆';
                } else if (progress.partial) {
                    status = 'partial';
                    statusIcon = '⭐';
                } else {
                    status = 'missed';
                    statusIcon = '😔';
                }
            } else if (isToday) {
                status = 'today';
                statusIcon = '🎯';
            } else {
                status = 'missed';
                statusIcon = '😔';
            }
        }
        
        calendarData.push({
            day: day,
            date: dateString,
            isOtherMonth: false,
            isToday: isToday,
            status: status,
            statusIcon: statusIcon
        });
    }
    
    // Add next month's leading days to fill the grid
    const totalCells = Math.ceil((startingDayOfWeek + daysInMonth) / 7) * 7;
    const remainingCells = totalCells - (startingDayOfWeek + daysInMonth);
    
    for (let day = 1; day <= remainingCells; day++) {
        calendarData.push({
            day: day,
            date: `${year}-${month + 2}-${day}`,
            isOtherMonth: true,
            isToday: false,
            status: 'other-month',
            statusIcon: ''
        });
    }
    
    return calendarData;
}

function getDailyProgressData() {
    // In a real app, this would come from a database
    // For demo purposes, we'll generate some sample data
    const progressData = JSON.parse(localStorage.getItem('dailyProgress') || '{}');
    
    // Add some sample data if none exists
    if (Object.keys(progressData).length === 0) {
        const today = new Date();
        const sampleData = {};
        
        // Add some completed days in the past
        for (let i = 1; i <= 10; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
            
            if (Math.random() > 0.3) { // 70% chance of completion
                sampleData[dateString] = {
                    completed: Math.random() > 0.2, // 80% fully completed
                    partial: Math.random() > 0.8, // 20% partially completed
                    exercises: Math.floor(Math.random() * 5) + 1,
                    stars: Math.floor(Math.random() * 10) + 1
                };
            }
        }
        
        localStorage.setItem('dailyProgress', JSON.stringify(sampleData));
        return sampleData;
    }
    
    return progressData;
}

function updateStreakDisplay() {
    const currentStreak = calculateCurrentStreak();
    document.getElementById('currentStreak').textContent = currentStreak;
}

function calculateCurrentStreak() {
    const dailyProgress = getDailyProgressData();
    const today = new Date();
    let streak = 0;
    
    // Count backwards from today
    for (let i = 0; i < 30; i++) { // Check last 30 days
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateString = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        
        const progress = dailyProgress[dateString];
        if (progress && (progress.completed || progress.partial)) {
            streak++;
        } else {
            break;
        }
    }
    
    return streak;
}

function setupCalendarListeners() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.calendar-day:not(.header):not(.other-month):not(.future)')) {
            const dayElement = e.target.closest('.calendar-day');
            const date = dayElement.getAttribute('data-date');
            showDayDetails(date, dayElement);
        }
    });
}

function showDayDetails(date, dayElement) {
    const dailyProgress = getDailyProgressData();
    const progress = dailyProgress[date] || {};
    
    const modal = document.createElement('div');
    modal.className = 'progress-modal-overlay';
    modal.innerHTML = `
        <div class="progress-modal">
            <div class="modal-header">
                <h3>📅 ${formatDateForDisplay(date)}</h3>
                <button class="close-modal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="progress-info">
                    ${progress.completed || progress.partial ? `
                        <h4>Great work! 🎉</h4>
                        <p>You completed your rehabilitation session on this day.</p>
                        
                        <div class="day-stats">
                            <div class="stat-item">
                                <strong>Exercises Completed:</strong> ${progress.exercises || 0}
                            </div>
                            <div class="stat-item">
                                <strong>Stars Earned:</strong> ${progress.stars || 0}
                            </div>
                            <div class="stat-item">
                                <strong>Status:</strong> ${progress.completed ? 'Fully Completed' : 'Partially Completed'}
                            </div>
                        </div>
                    ` : `
                        <h4>No activity recorded 😔</h4>
                        <p>It looks like you missed your rehabilitation session on this day. That's okay - consistency is key, but everyone needs a break sometimes!</p>
                        
                        <div class="encouragement">
                            <p><strong>💪 Keep going!</strong> Tomorrow is a new opportunity to continue your rehabilitation journey.</p>
                        </div>
                    `}
                </div>
            </div>
            <div class="modal-footer">
                <button class="close-progress-modal primary-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Animate in
    setTimeout(() => modal.classList.add('show'), 10);
    
    // Close handlers
    modal.querySelector('.close-modal').addEventListener('click', closeModal);
    modal.querySelector('.close-progress-modal').addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeModal();
    });
    
    function closeModal() {
        modal.classList.remove('show');
        setTimeout(() => modal.remove(), 300);
    }
}

function formatDateForDisplay(dateString) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Function to mark a day as completed (to be called from exercise sessions)
function markDayCompleted(exercises = 1, stars = 1, fullyCompleted = true) {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
    
    const dailyProgress = getDailyProgressData();
    dailyProgress[dateString] = {
        completed: fullyCompleted,
        partial: !fullyCompleted,
        exercises: exercises,
        stars: stars,
        timestamp: today.toISOString()
    };
    
    localStorage.setItem('dailyProgress', JSON.stringify(dailyProgress));
    
    // Update the calendar display
    generateCandyCalendar();
    updateStreakDisplay();
}

// Make function available globally for other scripts
window.markDayCompleted = markDayCompleted;
