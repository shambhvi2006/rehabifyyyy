// correction-sidebar.js
// Live Correction System - Real-time movement analysis and feedback

class LiveCorrectionSystem {
    constructor() {
        this.corrections = [];
        this.currentExercise = null;
        this.lastCorrection = 0;
        this.analysisInterval = null;
        this.postureHistory = [];
        this.movementQuality = {
            speed: 'good',
            form: 'good',
            range: 'good',
            alignment: 'good'
        };
        
        this.init();
    }
    
    init() {
        // Initialize live corrections in the main HUD
        this.container = document.getElementById('liveCorrections');
        this.statusElement = document.getElementById('correctionStatus');
        
        if (!this.container) {
            console.warn('Live correction container not found');
            return;
        }
        
        // Clear any existing content
        this.container.innerHTML = `
            <div class="correction-item waiting" id="correctionStatus">
                <div class="correction-text">Ready to start...</div>
            </div>
        `;
        
        this.startLiveAnalysis();
    }
    
    startLiveAnalysis() {
        // Start continuous movement analysis
        this.analysisInterval = setInterval(() => {
            this.analyzeCurrentMovement();
        }, 500); // Analyze every 500ms
    }
    
    stopLiveAnalysis() {
        if (this.analysisInterval) {
            clearInterval(this.analysisInterval);
            this.analysisInterval = null;
        }
    }
    
    analyzeCurrentMovement() {
        console.log('🔄 Live correction analysis tick');
        
        // Force access to global variables
        const globalState = {
            latestLm: window.latestLm,
            running: window.running,
            currentExercise: this.currentExercise
        };
        
        console.log('🧪 Global state check:', {
            latestLm: !!globalState.latestLm,
            running: !!globalState.running, 
            currentExercise: !!globalState.currentExercise
        });
        
        // FORCE SHOW CORRECTIONS REGARDLESS OF CONDITIONS for debugging
        const corrections = [];
        
        // Always add a test correction
        const testCorrections = [
            'Keep your shoulders level',
            'Straighten both elbows', 
            'Lift your arms higher',
            'Slow down your movement',
            'Extend both arms fully'
        ];
        
        const randomTest = testCorrections[Math.floor(Math.random() * testCorrections.length)];
        corrections.push({
            type: 'info',
            message: randomTest,
            icon: '🧪',
            priority: 10
        });
        
        console.log('🎯 FORCED TEST: Showing correction:', randomTest);
        
        // If we have pose data, analyze it too
        if (globalState.latestLm && globalState.currentExercise) {
            const lm = globalState.latestLm;
            console.log('🔍 Analyzing movement for:', globalState.currentExercise.criteria, 'Pose detected:', !!lm);
        
        // This block is now handled above
        
            // Analyze based on current exercise type
            if (globalState.currentExercise.criteria === 'forwardReach') {
                corrections.push(...this.analyzeForwardReach(lm));
            } else if (globalState.currentExercise.criteria === 'overheadPress') {
                corrections.push(...this.analyzeOverheadPress(lm));
            } else if (globalState.currentExercise.criteria === 'shoulderAbduction') {
                corrections.push(...this.analyzeShoulderAbduction(lm));
            }
            
            // General posture analysis - always run this
            corrections.push(...this.analyzeGeneralPosture(lm));
        }
        
        console.log('✅ Found total corrections:', corrections.length, corrections);
        
        // ALWAYS show a correction (force it for debugging)
        if (corrections.length > 0) {
            const priorityCorrection = this.prioritizeCorrections(corrections);
            console.log('📢 Showing priority correction:', priorityCorrection);
            this.showLiveCorrection(priorityCorrection.type, priorityCorrection.message, priorityCorrection.icon);
        } else {
            console.log('⚠️ No corrections found - showing default');
            this.showLiveCorrection('info', 'Keep up the good work!', '✨');
        }
    }
    
    analyzeForwardReach(lm) {
        const corrections = [];
        
        // Check if shoulders are visible and level
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        
        if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder)) {
            corrections.push({
                type: 'error',
                message: 'Keep both shoulders visible in the frame',
                icon: '👀',
                priority: 10
            });
        } else {
            // Check shoulder alignment
            const shoulderLevel = this.checkShoulderLevel(lm);
            if (!shoulderLevel) {
                corrections.push({
                    type: 'warning',
                    message: 'Keep your shoulders level and parallel',
                    icon: '📐',
                    priority: 7
                });
            }
        }
        
        // Check arm extension
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        
        if (this.isVisible(leftWrist) && this.isVisible(rightWrist)) {
            const armExtension = this.checkArmExtension(lm);
            if (armExtension < 0.7) {
                corrections.push({
                    type: 'info',
                    message: 'Reach forward with both arms extended',
                    icon: '🤲',
                    priority: 5
                });
            }
        }
        
        return corrections;
    }
    
    analyzeOverheadPress(lm) {
        const corrections = [];
        
        // Check if both hands are moving together
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        
        if (this.isVisible(leftWrist) && this.isVisible(rightWrist)) {
            const handSync = this.checkHandSynchronization(lm);
            if (!handSync) {
                corrections.push({
                    type: 'warning',
                    message: 'Move both hands at the same time',
                    icon: '🙌',
                    priority: 8
                });
            }
            
            // Check overhead position
            const overheadPosition = this.checkOverheadPosition(lm);
            if (overheadPosition.needsCorrection) {
                corrections.push({
                    type: 'info',
                    message: 'Press hands higher overhead',
                    icon: '⬆️',
                    priority: 6
                });
            }
        }
        
        return corrections;
    }
    
    analyzeShoulderAbduction(lm) {
        const corrections = [];
        
        // Check arm elevation and symmetry
        const leftElbow = lm[13];
        const rightElbow = lm[14];
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        
        // Check arm height and provide specific guidance
        if (this.isVisible(leftElbow) && this.isVisible(rightElbow) && 
            this.isVisible(leftShoulder) && this.isVisible(rightShoulder)) {
            
            const leftArmHeight = this.getArmElevationLevel(leftShoulder, leftElbow);
            const rightArmHeight = this.getArmElevationLevel(rightShoulder, rightElbow);
            
            // Provide specific instructions based on arm height
            if (leftArmHeight < 0.3 && rightArmHeight < 0.3) {
                corrections.push({
                    type: 'info',
                    message: 'Lift both arms higher - raise them out to your sides',
                    icon: '⬆️',
                    priority: 8
                });
            } else if (leftArmHeight < 0.3) {
                corrections.push({
                    type: 'info',
                    message: 'Raise your left arm higher',
                    icon: '↗️',
                    priority: 8
                });
            } else if (rightArmHeight < 0.3) {
                corrections.push({
                    type: 'info',
                    message: 'Raise your right arm higher',
                    icon: '↖️',
                    priority: 8
                });
            }
            
            // Check symmetry
            const armSymmetry = this.checkArmSymmetry(lm);
            if (!armSymmetry) {
                const leftHigher = leftElbow.y < rightElbow.y;
                corrections.push({
                    type: 'warning',
                    message: leftHigher ? 'Lower your left arm to match your right' : 'Lower your right arm to match your left',
                    icon: '⚖️',
                    priority: 9
                });
            }
        }
        
        // Enhanced elbow straightness check
        if (this.isVisible(leftWrist) && this.isVisible(rightWrist)) {
            const leftElbowStraight = this.checkIndividualElbowStraightness(lm, 'left');
            const rightElbowStraight = this.checkIndividualElbowStraightness(lm, 'right');
            
            if (!leftElbowStraight && !rightElbowStraight) {
                corrections.push({
                    type: 'info',
                    message: 'Straighten both elbows - extend your arms fully',
                    icon: '📏',
                    priority: 7
                });
            } else if (!leftElbowStraight) {
                corrections.push({
                    type: 'info',
                    message: 'Straighten your left elbow',
                    icon: '📏',
                    priority: 7
                });
            } else if (!rightElbowStraight) {
                corrections.push({
                    type: 'info',
                    message: 'Straighten your right elbow',
                    icon: '📏',
                    priority: 7
                });
            }
        }
        
        // Check if arms are in proper abduction position
        if (this.isVisible(leftWrist) && this.isVisible(rightWrist) && 
            this.isVisible(leftShoulder) && this.isVisible(rightShoulder)) {
            const properAbduction = this.checkProperAbductionPosition(lm);
            if (!properAbduction.isCorrect) {
                corrections.push({
                    type: 'info',
                    message: properAbduction.instruction,
                    icon: '🔄',
                    priority: 6
                });
            }
        }
        
        return corrections;
    }
    
    analyzeGeneralPosture(lm) {
        const corrections = [];
        
        // Test correction - this should always trigger during shoulder abduction 
        if (this.currentExercise?.criteria === 'shoulderAbduction') {
            // Always add a test correction for now
            const leftWrist = lm[15];
            const rightWrist = lm[16];
            
            if (this.isVisible(leftWrist) && this.isVisible(rightWrist)) {
                // Random correction for testing
                const testCorrections = [
                    'Lift your left arm higher',
                    'Straighten your right elbow',
                    'Keep your shoulders level',
                    'Extend both arms fully',
                    'Slow down your movement'
                ];
                
                // Show a test correction 30% of the time
                if (Math.random() < 0.3) {
                    const randomCorrection = testCorrections[Math.floor(Math.random() * testCorrections.length)];
                    corrections.push({
                        type: 'info',
                        message: randomCorrection,
                        icon: '💡',
                        priority: 5
                    });
                }
            }
        }
        
        // Check trunk rotation
        const trunkRotation = this.checkTrunkRotation(lm);
        if (trunkRotation > 15) {
            corrections.push({
                type: 'warning',
                message: 'Keep your body facing forward',
                icon: '🎯',
                priority: 8
            });
        }
        
        // Check body visibility requirements
        if (this.currentExercise?.requiresWaist) {
            if (!this.checkWaistVisible(lm)) {
                corrections.push({
                    type: 'error',
                    message: 'Show your body down to the waist',
                    icon: '📹',
                    priority: 10
                });
            }
        }
        
        return corrections;
    }
    
    // Helper methods for movement analysis
    isVisible(point) {
        return point && (point.visibility === undefined || point.visibility >= 0.25);
    }
    
    checkShoulderLevel(lm) {
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        
        if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder)) return false;
        
        const heightDiff = Math.abs(leftShoulder.y - rightShoulder.y);
        return heightDiff < 0.05; // 5% of frame height tolerance - more lenient
    }
    
    checkArmExtension(lm) {
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        
        if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder) || 
            !this.isVisible(leftWrist) || !this.isVisible(rightWrist)) return 0;
            
        // Calculate extension based on forward reach
        const avgShoulderZ = (leftShoulder.z + rightShoulder.z) / 2;
        const avgWristZ = (leftWrist.z + rightWrist.z) / 2;
        
        return Math.max(0, (avgShoulderZ - avgWristZ) / 0.1); // Normalize to 0-1
    }
    
    checkHandSynchronization(lm) {
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        
        if (!this.isVisible(leftWrist) || !this.isVisible(rightWrist)) return false;
        
        const heightDiff = Math.abs(leftWrist.y - rightWrist.y);
        return heightDiff < 0.05; // 5% tolerance for hand synchronization
    }
    
    checkOverheadPosition(lm) {
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        const nose = lm[0];
        
        if (!this.isVisible(leftWrist) || !this.isVisible(rightWrist) || !this.isVisible(nose)) {
            return { needsCorrection: false };
        }
        
        const avgWristY = (leftWrist.y + rightWrist.y) / 2;
        const isOverhead = avgWristY < (nose.y - 0.1); // Hands should be above head
        
        return { needsCorrection: !isOverhead };
    }
    
    checkArmSymmetry(lm) {
        const leftElbow = lm[13];
        const rightElbow = lm[14];
        
        if (!this.isVisible(leftElbow) || !this.isVisible(rightElbow)) return false;
        
        const heightDiff = Math.abs(leftElbow.y - rightElbow.y);
        return heightDiff < 0.04; // 4% tolerance for arm symmetry
    }
    
    checkElbowStraightness(lm) {
        // Simplified check - in a full system this would calculate elbow angles
        const leftShoulder = lm[11];
        const leftElbow = lm[13];
        const leftWrist = lm[15];
        
        if (!this.isVisible(leftShoulder) || !this.isVisible(leftElbow) || !this.isVisible(leftWrist)) {
            return true; // Can't check, assume OK
        }
        
        // Simple distance check - elbows should be roughly between shoulders and wrists
        const shoulderWristDist = Math.hypot(
            leftShoulder.x - leftWrist.x,
            leftShoulder.y - leftWrist.y
        );
        const shoulderElbowDist = Math.hypot(
            leftShoulder.x - leftElbow.x,
            leftShoulder.y - leftElbow.y
        );
        
        return shoulderElbowDist / shoulderWristDist > 0.4; // Rough ratio check
    }
    
    checkTrunkRotation(lm) {
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        const leftHip = lm[23];
        const rightHip = lm[24];
        
        if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder) ||
            !this.isVisible(leftHip) || !this.isVisible(rightHip)) {
            return 0;
        }
        
        // Calculate shoulder and hip line angles
        const shoulderAngle = Math.atan2(
            rightShoulder.y - leftShoulder.y,
            rightShoulder.x - leftShoulder.x
        ) * 180 / Math.PI;
        
        const hipAngle = Math.atan2(
            rightHip.y - leftHip.y,
            rightHip.x - leftHip.x
        ) * 180 / Math.PI;
        
        return Math.abs(shoulderAngle - hipAngle);
    }
    
    checkWaistVisible(lm) {
        const leftHip = lm[23];
        const rightHip = lm[24];
        return this.isVisible(leftHip) && this.isVisible(rightHip);
    }
    
    // Enhanced helper methods for specific movement analysis
    getArmElevationLevel(shoulder, elbow) {
        if (!this.isVisible(shoulder) || !this.isVisible(elbow)) return 0;
        
        // Calculate arm elevation relative to shoulder height
        const heightDiff = shoulder.y - elbow.y;
        // Normalize to 0-1 scale (higher values = more elevated)
        return Math.max(0, Math.min(1, heightDiff / 0.15));
    }
    
    checkIndividualElbowStraightness(lm, side) {
        const shoulderIndex = side === 'left' ? 11 : 12;
        const elbowIndex = side === 'left' ? 13 : 14;
        const wristIndex = side === 'left' ? 15 : 16;
        
        const shoulder = lm[shoulderIndex];
        const elbow = lm[elbowIndex];
        const wrist = lm[wristIndex];
        
        if (!this.isVisible(shoulder) || !this.isVisible(elbow) || !this.isVisible(wrist)) {
            return true; // Can't check, assume OK
        }
        
        // Calculate angle at elbow using dot product
        const upperArm = {
            x: elbow.x - shoulder.x,
            y: elbow.y - shoulder.y
        };
        const foreArm = {
            x: wrist.x - elbow.x,
            y: wrist.y - elbow.y
        };
        
        // Calculate angle between upper arm and forearm
        const dotProduct = upperArm.x * foreArm.x + upperArm.y * foreArm.y;
        const upperArmMag = Math.sqrt(upperArm.x * upperArm.x + upperArm.y * upperArm.y);
        const foreArmMag = Math.sqrt(foreArm.x * foreArm.x + foreArm.y * foreArm.y);
        
        if (upperArmMag === 0 || foreArmMag === 0) return true;
        
        const cosAngle = dotProduct / (upperArmMag * foreArmMag);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * 180 / Math.PI;
        
        // Elbow is considered straight if angle is greater than 160 degrees
        return angle > 160;
    }
    
    checkProperAbductionPosition(lm) {
        const leftShoulder = lm[11];
        const rightShoulder = lm[12];
        const leftWrist = lm[15];
        const rightWrist = lm[16];
        
        if (!this.isVisible(leftShoulder) || !this.isVisible(rightShoulder) ||
            !this.isVisible(leftWrist) || !this.isVisible(rightWrist)) {
            return { isCorrect: true, instruction: '' };
        }
        
        // Check if arms are extending laterally (horizontally out to sides)
        const leftArmVector = {
            x: leftWrist.x - leftShoulder.x,
            y: leftWrist.y - leftShoulder.y
        };
        const rightArmVector = {
            x: rightWrist.x - rightShoulder.x,
            y: rightWrist.y - rightShoulder.y
        };
        
        // Calculate angles from horizontal
        const leftAngle = Math.atan2(leftArmVector.y, leftArmVector.x) * 180 / Math.PI;
        const rightAngle = Math.atan2(rightArmVector.y, -rightArmVector.x) * 180 / Math.PI; // Mirror for right side
        
        // Check if arms are roughly horizontal (abducted position)
        const targetAngle = 0; // Horizontal
        const tolerance = 30; // degrees
        
        const leftInPosition = Math.abs(leftAngle - targetAngle) < tolerance;
        const rightInPosition = Math.abs(rightAngle - targetAngle) < tolerance;
        
        if (!leftInPosition && !rightInPosition) {
            return {
                isCorrect: false,
                instruction: 'Extend both arms out to your sides horizontally'
            };
        } else if (!leftInPosition) {
            return {
                isCorrect: false,
                instruction: 'Move your left arm more to the side'
            };
        } else if (!rightInPosition) {
            return {
                isCorrect: false,
                instruction: 'Move your right arm more to the side'
            };
        }
        
        return { isCorrect: true, instruction: '' };
    }
    
    prioritizeCorrections(corrections) {
        // Sort by priority (higher number = more important)
        corrections.sort((a, b) => b.priority - a.priority);
        return corrections[0];
    }
    
    showLiveCorrection(type, message, icon = '💡') {
        const now = Date.now();
        if (now - this.lastCorrection < 2000) return; // Debounce corrections
        
        this.lastCorrection = now;
        
        // Clear existing corrections
        this.container.innerHTML = '';
        
        // Create correction element
        const correctionElement = document.createElement('div');
        correctionElement.className = `correction-item ${type}`;
        correctionElement.innerHTML = `
            <div class="correction-icon">${icon}</div>
            <div class="correction-text">${message}</div>
        `;
        
        // Add with animation
        correctionElement.style.opacity = '0';
        correctionElement.style.transform = 'translateY(-10px)';
        this.container.appendChild(correctionElement);
        
        // Animate in
        requestAnimationFrame(() => {
            correctionElement.style.transition = 'all 0.3s ease';
            correctionElement.style.opacity = '1';
            correctionElement.style.transform = 'translateY(0)';
        });
        
        // Auto-clear after delay if it's not an error
        if (type !== 'error') {
            setTimeout(() => {
                if (correctionElement.parentNode) {
                    correctionElement.style.opacity = '0';
                    setTimeout(() => {
                        if (correctionElement.parentNode) {
                            correctionElement.remove();
                        }
                    }, 300);
                }
            }, 3000);
        }
    }
    
    showPositiveFeedback() {
        const now = Date.now();
        if (now - this.lastCorrection < 4000) return; // Don't override recent corrections
        
        const positiveMessages = [
            { text: "Great form! Keep it up!", icon: "✨" },
            { text: "Perfect positioning!", icon: "👍" },
            { text: "Excellent movement!", icon: "💪" },
            { text: "You're doing amazing!", icon: "🌟" },
            { text: "Smooth and controlled!", icon: "🎯" }
        ];
        
        const randomMsg = positiveMessages[Math.floor(Math.random() * positiveMessages.length)];
        
        // Only show if container is empty or has waiting message
        if (this.container.children.length === 0 || 
            this.container.querySelector('.correction-item.waiting')) {
            this.showLiveCorrection('success', randomMsg.text, randomMsg.icon);
        }
    }
    
    // Public methods for exercise integration
    startExercise(exercise) {
        this.currentExercise = exercise;
        this.corrections = [];
        
        // Show starting message
        this.container.innerHTML = `
            <div class="correction-item info">
                <div class="correction-icon">🏃</div>
                <div class="correction-text">Exercise started - analyzing your form...</div>
            </div>
        `;
    }
    
    stopExercise() {
        this.currentExercise = null;
        this.container.innerHTML = `
            <div class="correction-item waiting">
                <div class="correction-icon">⏳</div>
                <div class="correction-text">Ready for next exercise...</div>
            </div>
        `;
    }
    
    celebrateRep() {
        this.showLiveCorrection('success', 'Great rep! 🎉', '✅');
    }
    
    reset() {
        this.corrections = [];
        this.currentExercise = null;
        this.container.innerHTML = `
            <div class="correction-item waiting">
                <div class="correction-icon">⏳</div>
                <div class="correction-text">Ready to start...</div>
            </div>
        `;
    }
    
    destroy() {
        this.stopLiveAnalysis();
    }
}

// Legacy class for backward compatibility
class CorrectionSidebar {
    constructor() {
        this.sidebar = null;
        this.isActive = false;
        this.corrections = [];
        this.tips = [
            { icon: '✨', text: 'Position yourself so your entire upper body is visible' },
            { icon: '🎯', text: 'Keep your movements slow and controlled' },
            { icon: '💪', text: 'Focus on proper form over speed' },
            { icon: '🌟', text: 'Take breaks when needed - consistency is key!' }
        ];
        this.currentExercise = null;
        this.motivationalMessages = [
            "You're doing amazing! Every rep counts towards your recovery.",
            "Great form! Your dedication is inspiring.",
            "Keep up the excellent work! Progress takes time and patience.",
            "Fantastic effort! Your body is getting stronger every day.",
            "Outstanding! You're building healthy habits that will last.",
            "Wonderful progress! Small steps lead to big achievements.",
            "Excellent focus! Your commitment to recovery is admirable.",
            "Keep going strong! Every session brings you closer to your goals."
        ];
        
        this.init();
    }
    
    init() {
        this.createSidebar();
        this.setupEventListeners();
        this.show(); // Start with sidebar visible
    }
    
    createSidebar() {
        // Check if sidebar already exists
        if (document.getElementById('correctionSidebar')) {
            this.sidebar = document.getElementById('correctionSidebar');
            return;
        }
        
        // If not found in HTML, create it (fallback)
        const sidebarHTML = `
            <aside class="correction-sidebar active" id="correctionSidebar">
                <div class="sidebar-header">
                    <h3>🎯 Live Coaching</h3>
                    <button class="sidebar-toggle" id="sidebarToggle">✕</button>
                </div>
                
                <div class="sidebar-content">
                    <div class="current-exercise-info">
                        <div class="exercise-name" id="sidebarExerciseName">Ready to Start</div>
                        <div class="exercise-progress" id="sidebarProgress">Click Start to begin</div>
                    </div>
                    
                    <div class="corrections-panel">
                        <div class="corrections-header">
                            <h4>📋 Form Corrections</h4>
                        </div>
                        <div class="corrections-list" id="correctionsList">
                            <div class="correction-item waiting">
                                <div class="correction-icon">⏳</div>
                                <div class="correction-text">Waiting for exercise to start...</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="tips-panel">
                        <div class="tips-header">
                            <h4>💡 Pro Tips</h4>
                        </div>
                        <div class="tips-list" id="tipsList">
                            <div class="tip-item">
                                <div class="tip-icon">✨</div>
                                <div class="tip-text">Position yourself so your entire upper body is visible</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="motivation-panel">
                        <div class="motivation-header">
                            <h4>🌟 Motivation</h4>
                        </div>
                        <div class="motivation-text" id="motivationText">
                            You're doing great! Every rep brings you closer to your goals.
                        </div>
                    </div>
                </div>
            </aside>
        `;
        
        document.body.insertAdjacentHTML('beforeend', sidebarHTML);
        this.sidebar = document.getElementById('correctionSidebar');
    }
    
    setupEventListeners() {
        const toggleBtn = document.getElementById('sidebarToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => this.toggle());
        }
        
        // Listen for escape key to close sidebar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isActive) {
                this.hide();
            }
        });
    }
    
    show() {
        if (this.sidebar) {
            this.sidebar.classList.add('active');
            this.isActive = true;
            
            // Adjust main content margin if needed
            const mainContent = document.querySelector('.stage-with-sidebar, .stage');
            if (mainContent && window.innerWidth > 1200) {
                mainContent.style.marginRight = '370px';
            }
        }
    }
    
    hide() {
        if (this.sidebar) {
            this.sidebar.classList.remove('active');
            this.isActive = false;
            
            // Reset main content margin
            const mainContent = document.querySelector('.stage-with-sidebar, .stage');
            if (mainContent) {
                mainContent.style.marginRight = '';
            }
        }
    }
    
    toggle() {
        if (this.isActive) {
            this.hide();
        } else {
            this.show();
        }
    }
    
    updateExerciseInfo(exerciseName, progress) {
        const nameElement = document.getElementById('sidebarExerciseName');
        const progressElement = document.getElementById('sidebarProgress');
        
        if (nameElement) {
            nameElement.textContent = exerciseName || 'Exercise Session';
        }
        
        if (progressElement) {
            progressElement.textContent = progress || 'In progress...';
        }
        
        this.currentExercise = exerciseName;
    }
    
    addCorrection(type, message, icon = '⚠️') {
        const correctionsList = document.getElementById('correctionsList');
        if (!correctionsList) return;
        
        // Remove waiting message if it exists
        const waitingItem = correctionsList.querySelector('.correction-item.waiting');
        if (waitingItem) {
            waitingItem.remove();
        }
        
        // Create correction element
        const correctionElement = document.createElement('div');
        correctionElement.className = `correction-item ${type}`;
        correctionElement.innerHTML = `
            <div class="correction-icon">${icon}</div>
            <div class="correction-text">${message}</div>
        `;
        
        // Add with animation
        correctionElement.style.opacity = '0';
        correctionElement.style.transform = 'translateX(20px)';
        correctionsList.insertBefore(correctionElement, correctionsList.firstChild);
        
        // Animate in
        requestAnimationFrame(() => {
            correctionElement.style.transition = 'all 0.3s ease';
            correctionElement.style.opacity = '1';
            correctionElement.style.transform = 'translateX(0)';
        });
        
        // Keep only the latest 5 corrections
        const corrections = correctionsList.querySelectorAll('.correction-item');
        if (corrections.length > 5) {
            corrections[corrections.length - 1].remove();
        }
        
        // Store correction
        this.corrections.unshift({
            type,
            message,
            icon,
            timestamp: Date.now()
        });
        
        // Limit stored corrections
        if (this.corrections.length > 10) {
            this.corrections = this.corrections.slice(0, 10);
        }
    }
    
    addSuccessMessage(message) {
        this.addCorrection('success', message, '✅');
    }
    
    addWarningMessage(message) {
        this.addCorrection('warning', message, '⚠️');
    }
    
    addErrorMessage(message) {
        this.addCorrection('error', message, '❌');
    }
    
    addInfoMessage(message) {
        this.addCorrection('info', message, 'ℹ️');
    }
    
    clearCorrections() {
        const correctionsList = document.getElementById('correctionsList');
        if (correctionsList) {
            correctionsList.innerHTML = `
                <div class="correction-item waiting">
                    <div class="correction-icon">⏳</div>
                    <div class="correction-text">Waiting for exercise feedback...</div>
                </div>
            `;
        }
        this.corrections = [];
    }
    
    updateTips(exerciseType) {
        const tipsList = document.getElementById('tipsList');
        if (!tipsList) return;
        
        let relevantTips = this.tips;
        
        // Get exercise-specific tips
        if (exerciseType) {
            const exerciseTips = this.getExerciseTips(exerciseType);
            if (exerciseTips.length > 0) {
                relevantTips = exerciseTips;
            }
        }
        
        // Clear existing tips
        tipsList.innerHTML = '';
        
        // Add new tips
        relevantTips.slice(0, 3).forEach((tip, index) => {
            const tipElement = document.createElement('div');
            tipElement.className = 'tip-item';
            tipElement.innerHTML = `
                <div class="tip-icon">${tip.icon}</div>
                <div class="tip-text">${tip.text}</div>
            `;
            
            // Add with staggered animation
            tipElement.style.opacity = '0';
            tipElement.style.transform = 'translateY(10px)';
            tipsList.appendChild(tipElement);
            
            setTimeout(() => {
                tipElement.style.transition = 'all 0.3s ease';
                tipElement.style.opacity = '1';
                tipElement.style.transform = 'translateY(0)';
            }, index * 100);
        });
    }
    
    getExerciseTips(exerciseType) {
        const exerciseTips = {
            'forwardReach': [
                { icon: '👆', text: 'Keep your shoulders level throughout the movement' },
                { icon: '🎯', text: 'Reach forward slowly and hold the position' },
                { icon: '💪', text: 'Engage your core for stability' }
            ],
            'overheadPress': [
                { icon: '🙌', text: 'Press both hands straight overhead simultaneously' },
                { icon: '📐', text: 'Keep your back straight and core engaged' },
                { icon: '⚖️', text: 'Maintain balance throughout the movement' }
            ],
            'shoulderAbduction': [
                { icon: '✋', text: 'Raise your arms out to the sides slowly' },
                { icon: '📏', text: 'Keep your arms parallel to the floor at the top' },
                { icon: '🔄', text: 'Control the movement both up and down' }
            ]
        };
        
        return exerciseTips[exerciseType] || this.tips;
    }
    
    updateMotivation(message) {
        const motivationElement = document.getElementById('motivationText');
        if (motivationElement) {
            // Fade out
            motivationElement.style.transition = 'opacity 0.3s ease';
            motivationElement.style.opacity = '0';
            
            setTimeout(() => {
                motivationElement.textContent = message || this.getRandomMotivationalMessage();
                motivationElement.style.opacity = '1';
            }, 300);
        }
    }
    
    getRandomMotivationalMessage() {
        return this.motivationalMessages[Math.floor(Math.random() * this.motivationalMessages.length)];
    }
    
    onExerciseStart(exerciseName, exerciseType) {
        this.updateExerciseInfo(exerciseName, 'Exercise starting...');
        this.clearCorrections();
        this.updateTips(exerciseType);
        this.addInfoMessage('Exercise session has started! Follow the instructions carefully.');
        this.updateMotivation();
    }
    
    onExerciseComplete(stats) {
        this.updateExerciseInfo(this.currentExercise, 'Exercise completed!');
        this.addSuccessMessage(`Great job! You completed the exercise with ${stats?.reps || 0} reps.`);
        
        if (stats?.starsEarned) {
            this.addSuccessMessage(`🌟 You earned ${stats.starsEarned} stars!`);
        }
        
        this.updateMotivation('Excellent work! Take a moment to rest before your next exercise.');
    }
    
    onRepComplete(repCount, targetReps) {
        const progress = `Rep ${repCount}/${targetReps} completed`;
        this.updateExerciseInfo(this.currentExercise, progress);
        this.addSuccessMessage(`✅ Rep ${repCount} completed! Keep it up!`);
    }
    
    onFormCorrection(correctionType, message) {
        switch (correctionType) {
            case 'posture':
                this.addWarningMessage(`Posture: ${message}`);
                break;
            case 'speed':
                this.addWarningMessage(`Pace: ${message}`);
                break;
            case 'range':
                this.addWarningMessage(`Range of Motion: ${message}`);
                break;
            case 'alignment':
                this.addWarningMessage(`Alignment: ${message}`);
                break;
            case 'visibility':
                this.addErrorMessage(`Visibility: ${message}`);
                break;
            default:
                this.addWarningMessage(message);
        }
    }
    
    // Method to be called by exercise system when user needs positioning help
    onPositioningFeedback(message, isError = false) {
        if (isError) {
            this.addErrorMessage(message);
        } else {
            this.addInfoMessage(message);
        }
    }
    
    // Animation for when user does something well
    celebrateSuccess() {
        const sidebar = this.sidebar;
        if (sidebar) {
            sidebar.style.animation = 'celebration 0.6s ease';
            setTimeout(() => {
                sidebar.style.animation = '';
            }, 600);
        }
    }
    
    // Reset for new exercise session
    reset() {
        this.clearCorrections();
        this.updateExerciseInfo('Ready to Start', 'Click Start to begin');
        this.updateTips();
        this.updateMotivation();
    }
}

// Create global instances
window.correctionSidebar = null;
window.liveCorrectionSystem = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - initializing correction systems');
    console.log('Video element:', document.getElementById('video'));
    console.log('Overlay element:', document.getElementById('overlay'));
    console.log('Live corrections container:', document.getElementById('liveCorrections'));
    
    // Only initialize if we're on the exercise page (not dashboard)
    if (document.getElementById('video') && document.getElementById('overlay')) {
        console.log('✅ Initializing LiveCorrectionSystem');
        // Initialize the new live correction system
        window.liveCorrectionSystem = new LiveCorrectionSystem();
        console.log('LiveCorrectionSystem created:', window.liveCorrectionSystem);
        
        // Keep legacy sidebar for compatibility but hide it by default
        window.correctionSidebar = new CorrectionSidebar();
        if (window.correctionSidebar.sidebar) {
            window.correctionSidebar.hide();
        }
    } else {
        console.log('❌ Not initializing - missing video or overlay elements');
    }
});

// Add celebration animation to CSS
const celebrationStyles = `
    @keyframes celebration {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
        50% { border-color: #48c78e; box-shadow: 0 0 20px rgba(72, 199, 142, 0.5); }
    }
    
    .correction-sidebar {
        transition: all 0.3s ease;
    }
    
    .calendar-day {
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.3s ease;
    }
    
    .day-stats {
        margin: 20px 0;
        padding: 16px;
        background: rgba(126, 225, 255, 0.1);
        border-radius: 8px;
        border-left: 4px solid var(--accent);
    }
    
    .stat-item {
        margin: 8px 0;
        color: var(--ink);
        font-size: 1rem;
    }
    
    .encouragement {
        margin-top: 20px;
        padding: 16px;
        background: linear-gradient(135deg, #fff3cd, #fef9e7);
        border-radius: 8px;
        border: 1px solid #ffeaa7;
    }
`;

// Add styles to page
const correctionStyleSheet = document.createElement('style');
correctionStyleSheet.textContent = celebrationStyles;
document.head.appendChild(correctionStyleSheet);

// Export for other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CorrectionSidebar;
}
