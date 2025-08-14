// levelup.js
document.addEventListener('DOMContentLoaded', function() {
    initializeLevelUpPage();
});

function initializeLevelUpPage() {
    // Get level from URL params or default to 2
    const urlParams = new URLSearchParams(window.location.search);
    const newLevel = parseInt(urlParams.get('level')) || 2;
    
    // Update level display
    document.getElementById('newLevel').textContent = newLevel;
    
    // Update level badge styling
    const levelBadge = document.querySelector('.level-badge');
    levelBadge.classList.add(`level-${newLevel}`);
    
    // Simulate real stats (in real app, these would come from the session)
    const stats = getSessionStats();
    updateStats(stats);
    
    // Initialize animations
    startCelebrationAnimations();
    
    // Setup event listeners
    setupEventListeners(newLevel);
}

function getSessionStats() {
    // In a real app, these would be passed from the main session
    return {
        exercisesCompleted: 4,
        starsEarned: Math.floor(Math.random() * 50) + 100,
        maxStreak: Math.floor(Math.random() * 10) + 15,
        accuracy: Math.floor(Math.random() * 5) + 95,
        timeSpent: Math.floor(Math.random() * 10) + 15 // minutes
    };
}

function updateStats(stats) {
    // Animate counting up the numbers
    animateNumber('exercisesCompleted', 0, stats.exercisesCompleted, 1000);
    animateNumber('starsEarned', 0, stats.starsEarned, 1500);
    animateNumber('maxStreak', 0, stats.maxStreak, 1200);
}

function animateNumber(elementId, start, end, duration) {
    const element = document.getElementById(elementId);
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

function startCelebrationAnimations() {
    // Animate floating emojis
    const emojis = document.querySelectorAll('.floating-emoji');
    emojis.forEach((emoji, index) => {
        emoji.style.animationDelay = `${index * 0.2}s`;
    });
    
    // Animate content entrance
    const content = document.querySelector('.levelup-content');
    content.style.opacity = '0';
    content.style.transform = 'translateY(50px)';
    
    setTimeout(() => {
        content.style.transition = 'all 0.8s ease-out';
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 300);
    
    // Animate level badge
    const badge = document.querySelector('.level-badge');
    setTimeout(() => {
        badge.classList.add('animate-in');
    }, 500);
    
    // Animate summary cards
    const cards = document.querySelectorAll('.summary-card');
    cards.forEach((card, index) => {
        setTimeout(() => {
            card.classList.add('animate-in');
        }, 800 + index * 200);
    });
    
    // Play celebration sound effect (if available)
    playCelebrationSound();
}

function playCelebrationSound() {
    // Create a simple celebratory tone
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create a sequence of celebratory notes
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, C octave
        
        notes.forEach((frequency, index) => {
            setTimeout(() => {
                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);
                
                oscillator.frequency.value = frequency;
                oscillator.type = 'sine';
                
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
                gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);
                
                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.5);
            }, index * 150);
        });
    } catch (e) {
        console.log('Audio not available');
    }
}

function setupEventListeners(newLevel) {
    const continueBtn = document.getElementById('continueBtn');
    const takeBreakBtn = document.getElementById('takeBreakBtn');
    
    continueBtn.addEventListener('click', function() {
        // Add loading state
        this.classList.add('loading');
        this.innerHTML = '<span class="btn-text">Loading...</span>';
        
        // Store level progression
        localStorage.setItem('currentLevel', newLevel);
        
        // Redirect back to main app to continue with next level
        setTimeout(() => {
            window.location.href = `/?level=${newLevel}&continue=true`;
        }, 1000);
    });
    
    takeBreakBtn.addEventListener('click', function() {
        // Show break confirmation
        showBreakConfirmation();
    });
}

function showBreakConfirmation() {
    const overlay = document.createElement('div');
    overlay.className = 'break-overlay';
    overlay.innerHTML = `
        <div class="break-modal">
            <div class="break-icon">😴</div>
            <h3>Take a Well-Deserved Break!</h3>
            <p>Rest is an important part of recovery. Come back when you're ready to continue your rehabilitation journey.</p>
            <div class="break-actions">
                <button id="confirmBreak" class="confirm-break-btn">Yes, Take a Break</button>
                <button id="cancelBreak" class="cancel-break-btn">Continue Exercising</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
    
    // Animate in
    setTimeout(() => overlay.classList.add('show'), 10);
    
    // Event listeners
    document.getElementById('confirmBreak').addEventListener('click', function() {
        // Store progress and redirect to dashboard
        localStorage.setItem('lastSession', JSON.stringify({
            level: parseInt(document.getElementById('newLevel').textContent),
            completedAt: new Date().toISOString(),
            stats: getSessionStats()
        }));
        
        // Redirect to dashboard after the break
        window.location.href = '/dashboard.html';
    });
    
    document.getElementById('cancelBreak').addEventListener('click', function() {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 300);
    });
}

// Add styles dynamically
const styles = `
    .levelup-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #0c1320 0%, #1a1f2e 100%);
    }
    
    .celebration-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }
    
    .floating-emoji {
        position: absolute;
        font-size: 2rem;
        animation: float 4s ease-in-out infinite;
        opacity: 0.7;
    }
    
    .floating-emoji:nth-child(1) { top: 20%; left: 10%; animation-duration: 3s; }
    .floating-emoji:nth-child(2) { top: 15%; right: 15%; animation-duration: 4s; }
    .floating-emoji:nth-child(3) { bottom: 30%; left: 20%; animation-duration: 3.5s; }
    .floating-emoji:nth-child(4) { bottom: 20%; right: 10%; animation-duration: 4.2s; }
    .floating-emoji:nth-child(5) { top: 40%; left: 5%; animation-duration: 3.8s; }
    .floating-emoji:nth-child(6) { top: 50%; right: 5%; animation-duration: 3.2s; }
    
    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        33% { transform: translateY(-20px) rotate(5deg); }
        66% { transform: translateY(10px) rotate(-3deg); }
    }
    
    .levelup-content {
        text-align: center;
        max-width: 600px;
        padding: 40px;
        background: rgba(10, 13, 18, 0.9);
        border-radius: 20px;
        border: 2px solid var(--accent);
        backdrop-filter: blur(10px);
        box-shadow: 0 20px 40px rgba(126, 225, 255, 0.2);
    }
    
    .level-badge {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 100px;
        height: 100px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--level1-color), var(--level2-color));
        margin-bottom: 30px;
        position: relative;
        transform: scale(0);
        transition: transform 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    }
    
    .level-badge.animate-in {
        transform: scale(1);
    }
    
    .level-badge.level-2 {
        background: linear-gradient(135deg, var(--level2-color), #ffa726);
    }
    
    .level-number {
        font-size: 2.5rem;
        font-weight: 800;
        color: white;
        text-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    .level-text {
        font-size: 0.8rem;
        font-weight: 600;
        color: rgba(255,255,255,0.9);
        letter-spacing: 1px;
    }
    
    .levelup-title {
        font-size: 2.5rem;
        font-weight: 800;
        color: var(--accent);
        margin: 20px 0;
        text-shadow: 0 2px 10px rgba(126, 225, 255, 0.3);
    }
    
    .achievement-message {
        margin: 30px 0;
    }
    
    .main-message {
        font-size: 1.3rem;
        font-weight: 600;
        color: var(--ink);
        margin: 0 0 10px 0;
    }
    
    .sub-message {
        font-size: 1rem;
        color: var(--muted);
        margin: 0;
    }
    
    .progress-summary {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 20px;
        margin: 40px 0;
    }
    
    .summary-card {
        background: linear-gradient(135deg, var(--card), #0f1419);
        border: 1px solid var(--border);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        align-items: center;
        gap: 15px;
        opacity: 0;
        transform: translateY(20px);
        transition: all 0.5s ease;
    }
    
    .summary-card.animate-in {
        opacity: 1;
        transform: translateY(0);
    }
    
    .summary-icon {
        font-size: 2rem;
    }
    
    .summary-title {
        font-size: 0.9rem;
        color: var(--muted);
        font-weight: 500;
    }
    
    .summary-value {
        font-size: 1.8rem;
        font-weight: 800;
        color: var(--accent);
    }
    
    .next-level-preview {
        margin: 40px 0;
        padding: 30px;
        background: linear-gradient(135deg, rgba(126, 225, 255, 0.1), rgba(255, 159, 67, 0.1));
        border-radius: 16px;
        border: 1px solid var(--level2-color);
    }
    
    .next-level-preview h3 {
        color: var(--level2-color);
        margin: 0 0 20px 0;
        font-size: 1.4rem;
    }
    
    .preview-items {
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 20px;
    }
    
    .preview-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
    }
    
    .preview-icon {
        font-size: 2rem;
    }
    
    .preview-text {
        font-size: 0.9rem;
        color: var(--ink);
        font-weight: 500;
    }
    
    .action-buttons {
        display: flex;
        gap: 15px;
        justify-content: center;
        margin-top: 40px;
    }
    
    .continue-btn {
        background: linear-gradient(135deg, var(--level2-color), #ffa726);
        color: white;
        border: none;
        border-radius: 12px;
        padding: 15px 30px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(255, 159, 67, 0.3);
    }
    
    .continue-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(255, 159, 67, 0.4);
    }
    
    .continue-btn.loading {
        opacity: 0.8;
        transform: none;
    }
    
    .break-btn {
        background: transparent;
        color: var(--muted);
        border: 2px solid var(--border);
        border-radius: 12px;
        padding: 15px 30px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .break-btn:hover {
        border-color: var(--accent);
        color: var(--accent);
    }
    
    .break-overlay {
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
    
    .break-overlay.show {
        opacity: 1;
    }
    
    .break-modal {
        background: linear-gradient(135deg, var(--card), #0f1419);
        border: 2px solid var(--border);
        border-radius: 20px;
        padding: 40px;
        text-align: center;
        max-width: 400px;
        transform: scale(0.9);
        transition: transform 0.3s ease;
    }
    
    .break-overlay.show .break-modal {
        transform: scale(1);
    }
    
    .break-icon {
        font-size: 3rem;
        margin-bottom: 20px;
    }
    
    .break-modal h3 {
        color: var(--ink);
        margin: 0 0 15px 0;
    }
    
    .break-modal p {
        color: var(--muted);
        margin: 0 0 30px 0;
        line-height: 1.5;
    }
    
    .break-actions {
        display: flex;
        gap: 15px;
        justify-content: center;
    }
    
    .confirm-break-btn {
        background: linear-gradient(135deg, #e74c3c, #c0392b);
        color: white;
        border: none;
        border-radius: 8px;
        padding: 12px 20px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .cancel-break-btn {
        background: transparent;
        color: var(--accent);
        border: 2px solid var(--accent);
        border-radius: 8px;
        padding: 12px 20px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    @media (max-width: 600px) {
        .levelup-content {
            margin: 20px;
            padding: 30px 20px;
        }
        
        .levelup-title {
            font-size: 2rem;
        }
        
        .action-buttons {
            flex-direction: column;
        }
        
        .preview-items {
            justify-content: center;
        }
    }
`;

// Add styles to page
const styleSheet = document.createElement('style');
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);
