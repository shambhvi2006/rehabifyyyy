// feedback.js
document.addEventListener('DOMContentLoaded', function() {
    // Initialize interactive elements
    initializeRatingSystem();
    initializeSlider();
    initializeChart();
    initializeFormHandlers();
});

function initializeRatingSystem() {
    const stars = document.querySelectorAll('.star');
    const enjoymentInput = document.getElementById('enjoymentRating');
    
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            enjoymentInput.value = rating;
            
            // Update visual state
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('selected');
                    s.textContent = '⭐';
                } else {
                    s.classList.remove('selected');
                    s.textContent = '☆';
                }
            });
        });
        
        star.addEventListener('mouseenter', function() {
            const rating = parseInt(this.dataset.rating);
            stars.forEach((s, index) => {
                if (index < rating) {
                    s.classList.add('hover');
                } else {
                    s.classList.remove('hover');
                }
            });
        });
    });
    
    document.querySelector('.star-rating').addEventListener('mouseleave', function() {
        stars.forEach(s => s.classList.remove('hover'));
    });
}

function initializeSlider() {
    const slider = document.getElementById('intensity');
    const valueDisplay = document.getElementById('intensityValue');
    
    slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value;
        
        // Change color based on value
        const percentage = (this.value - 1) / 9 * 100;
        this.style.background = `linear-gradient(to right, #7ee1ff 0%, #7ee1ff ${percentage}%, #ddd ${percentage}%, #ddd 100%)`;
    });
}

function initializeChart() {
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    // Fake data showing mood improvement over a week
    const moodData = {
        labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        datasets: [{
            label: 'Mood Rating',
            data: [2.1, 2.8, 3.2, 3.8, 4.1, 4.3, 4.5],
            borderColor: '#7ee1ff',
            backgroundColor: 'rgba(126, 225, 255, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#7ee1ff',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6
        }, {
            label: 'Exercise Completion',
            data: [60, 75, 85, 90, 95, 98, 98],
            borderColor: '#ff9f43',
            backgroundColor: 'rgba(255, 159, 67, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#ff9f43',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 6
        }]
    };
    
    const config = {
        type: 'line',
        data: moodData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Your Progress This Week',
                    color: '#e9eef3',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    labels: {
                        color: '#e9eef3',
                        usePointStyle: true,
                        padding: 20
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 5,
                    ticks: {
                        color: '#a6b0c2',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(161, 176, 194, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#a6b0c2',
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(161, 176, 194, 0.2)'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    };
    
    new Chart(ctx, config);
}

function initializeFormHandlers() {
    const form = document.getElementById('feedbackForm');
    const submitBtn = document.querySelector('.submit-btn');
    const skipBtn = document.querySelector('.skip-btn');
    const homeBtn = document.getElementById('homeBtn');
    const restartBtn = document.getElementById('restartBtn');
    
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        handleFeedbackSubmission();
    });
    
    skipBtn.addEventListener('click', function() {
        showThankYouAndRedirect();
    });
    
    homeBtn.addEventListener('click', function() {
        window.location.href = '/';
    });
    
    restartBtn.addEventListener('click', function() {
        window.location.href = '/';
    });
}

function handleFeedbackSubmission() {
    const formData = new FormData(document.getElementById('feedbackForm'));
    const feedback = Object.fromEntries(formData.entries());
    
    // Store feedback (in real app, this would go to a server)
    localStorage.setItem('lastFeedback', JSON.stringify({
        ...feedback,
        timestamp: new Date().toISOString()
    }));
    
    // Show success animation
    showSubmissionSuccess();
}

function showSubmissionSuccess() {
    const submitBtn = document.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    
    submitBtn.textContent = '✓ Thank you!';
    submitBtn.style.background = 'linear-gradient(135deg, #48c78e, #5cbf7b)';
    submitBtn.disabled = true;
    
    // Show celebration
    createCelebrationEffect();
    
    setTimeout(() => {
        showThankYouAndRedirect();
    }, 2000);
}

function createCelebrationEffect() {
    // Create floating emojis
    const emojis = ['🎉', '✨', '💪', '⭐', '🏆'];
    
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const emoji = document.createElement('div');
            emoji.textContent = emojis[Math.floor(Math.random() * emojis.length)];
            emoji.style.cssText = `
                position: fixed;
                font-size: 24px;
                pointer-events: none;
                z-index: 9999;
                left: ${Math.random() * window.innerWidth}px;
                top: ${window.innerHeight}px;
                animation: celebrate 3s ease-out forwards;
            `;
            
            document.body.appendChild(emoji);
            
            setTimeout(() => {
                emoji.remove();
            }, 3000);
        }, i * 100);
    }
}

function showThankYouAndRedirect() {
    const thankYou = document.createElement('div');
    thankYou.innerHTML = `
        <div style="
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
            animation: fadeIn 0.5s ease;
        ">
            <div style="
                background: linear-gradient(135deg, #0a0d12, #0f1419);
                border: 2px solid #7ee1ff;
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                max-width: 400px;
                box-shadow: 0 10px 30px rgba(126, 225, 255, 0.3);
            ">
                <div style="font-size: 60px; margin-bottom: 20px;">🙏</div>
                <h2 style="color: #e9eef3; margin: 0 0 20px 0;">Thank You!</h2>
                <p style="color: #a6b0c2; margin: 0 0 30px 0;">
                    Your feedback helps us improve your rehabilitation experience.
                </p>
                <div style="color: #7ee1ff; font-size: 14px;">
                    Redirecting in <span id="countdown">3</span> seconds...
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(thankYou);
    
    let countdown = 3;
    const countdownEl = document.getElementById('countdown');
    
    const timer = setInterval(() => {
        countdown--;
        if (countdownEl) countdownEl.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(timer);
            window.location.href = '/dashboard.html';
        }
    }, 1000);
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes celebrate {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
    
    .star.hover,
    .star.selected {
        transform: scale(1.2);
        filter: brightness(1.2);
        transition: all 0.2s ease;
    }
    
    .mood-option input:checked + .mood-face {
        transform: scale(1.3);
        filter: brightness(1.2);
    }
`;
document.head.appendChild(style);
