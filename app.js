const STORAGE_KEY = 'focus_os_v1';

// Initial Data Structure (if nothing in local storage)
const defaultData = {
    streak: 0,
    lastLoginDate: null,
    routines: [
        {
            id: 'morning',
            title: 'Morning Reset',
            time: '06:30 - 07:10',
            expanded: true,
            tasks: [
                { id: 't1', title: 'Wake up at 6:30', mustDo: true, done: false },
                { id: 't2', title: 'Black coffee', mustDo: false, done: false },
                { id: 't3', title: 'Read 5 pages', mustDo: false, done: false },
                { id: 't4', title: 'Oil pulling', mustDo: false, done: false },
                { id: 't5', title: 'Brush teeth', mustDo: false, done: false },
                { id: 't6', title: 'Shower', mustDo: false, done: false }
            ]
        },
        {
            id: 'skills',
            title: 'Skills Sprint',
            time: '07:10 - 08:20',
            expanded: false,
            tasks: [
                { id: 's1', title: 'Code practice', mustDo: true, done: false },
                { id: 's2', title: 'Review notes', mustDo: false, done: false }
            ]
        },
        {
            id: 'gym',
            title: 'Gym',
            time: '08:30 - 10:30',
            expanded: false,
            tasks: [
                { id: 'g1', title: 'Warmup', mustDo: false, done: false },
                { id: 'g2', title: 'Main Lift', mustDo: true, done: false }
            ]
        },
        // NEW READING SECTION
        {
            id: 'reading',
            title: 'Deep Reading',
            time: '21:00 - 21:30',
            type: 'reading', // Special type
            expanded: false,
            bookName: 'Atomic Habits',
            currentPage: 45,
            totalPages: 300,
            dailyGoalPages: 10
        }
    ]
};

class FocusOS {
    constructor() {
        this.state = this.loadState();
        this.init();
    }

    init() {
        this.renderDate();
        this.checkStreak();
        this.renderRoutines();
        this.updateStreakUI();
    }

    loadState() {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : defaultData;
    }

    saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    }

    renderDate() {
        const options = { weekday: 'long', month: 'short', day: 'numeric' };
        document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', options);
    }

    // --- GAMIFICATION / STREAK LOGIC ---
    checkStreak() {
        const today = new Date().toDateString();
        const lastLogin = this.state.lastLoginDate;

        if (lastLogin !== today) {
            // It's a new day
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            
            // If last login was NOT yesterday and NOT today, streak breaks
            if (lastLogin !== yesterday.toDateString() && lastLogin !== null) {
                this.state.streak = 0;
            }
            // Update login date
            this.state.lastLoginDate = today;
            
            // Reset daily tasks (Optional: Un-comment if you want tasks to reset daily)
             this.resetDailyTasks(); 
            
            this.saveState();
        }
    }

    resetDailyTasks() {
        this.state.routines.forEach(r => {
            if(r.tasks) r.tasks.forEach(t => t.done = false);
        });
    }

    calculateDailyProgress() {
        let total = 0;
        let completed = 0;
        
        this.state.routines.forEach(r => {
            if (r.tasks) {
                total += r.tasks.length;
                completed += r.tasks.filter(t => t.done).length;
            }
        });
        
        if (total === 0) return 0;
        return (completed / total) * 100;
    }

    updateStreakUI() {
        document.getElementById('streakCount').innerText = this.state.streak;
        const progress = this.calculateDailyProgress();
        document.getElementById('dailyProgressFill').style.width = `${progress}%`;
        
        // Gamification: Increase streak if 100% done (simple logic)
        // In a real app, you might only increment streak at end of day
        if (progress === 100 && this.state.streakIncremented !== new Date().toDateString()) {
             // Example logic: this.state.streak++;
             // this.state.streakIncremented = new Date().toDateString();
             // this.saveState();
        }
    }

    // --- RENDERING ROUTINES ---
    renderRoutines() {
        const container = document.getElementById('routinesContainer');
        container.innerHTML = '';
        const routineTemplate = document.getElementById('routineTemplate');

        this.state.routines.forEach((routine, index) => {
            const clone = routineTemplate.content.cloneNode(true);
            const card = clone.querySelector('.routine-card');
            
            // Populate Header
            clone.querySelector('.routine-title').innerText = routine.title;
            clone.querySelector('.routine-time').innerText = routine.time;
            
            // Handle Expansion
            if (routine.expanded) card.classList.add('open');
            clone.querySelector('.routine-header').addEventListener('click', () => {
                routine.expanded = !routine.expanded;
                this.saveState();
                this.renderRoutines(); // Re-render to show animation state
            });

            // CONTENT
            const tasksContainer = clone.querySelector('.routine-tasks');

            if (routine.type === 'reading') {
                this.renderReadingSection(routine, tasksContainer);
                // Update Badge for reading
                const badge = clone.querySelector('.progress-circle');
                badge.innerText = '📖';
                badge.style.borderColor = 'var(--accent-blue)';
                badge.style.color = 'var(--accent-blue)';
            } else {
                this.renderTasks(routine, tasksContainer);
                // Update Badge for tasks
                const completedCount = routine.tasks.filter(t => t.done).length;
                const badge = clone.querySelector('.progress-circle');
                badge.innerText = `${completedCount}/${routine.tasks.length}`;
                
                if (completedCount === routine.tasks.length && routine.tasks.length > 0) {
                    badge.classList.add('completed');
                }
            }

            container.appendChild(clone);
        });
    }

    renderTasks(routine, container) {
        const taskTemplate = document.getElementById('taskTemplate');
        
        routine.tasks.forEach(task => {
            const tClone = taskTemplate.content.cloneNode(true);
            const row = tClone.querySelector('.task-row');
            const check = tClone.querySelector('.check-circle');
            
            tClone.querySelector('.task-name').innerText = task.title;
            
            if (task.mustDo) {
                tClone.querySelector('.tag-must-do').style.display = 'block';
            }

            if (task.done) {
                check.classList.add('checked');
                row.classList.add('done');
            }

            // Interaction
            row.addEventListener('click', () => {
                task.done = !task.done;
                this.saveState();
                this.renderRoutines(); // Re-render to update counts
                this.updateStreakUI();
            });

            container.appendChild(tClone);
        });
    }

    renderReadingSection(routine, container) {
        const template = document.getElementById('readingTemplate');
        const clone = template.content.cloneNode(true);
        
        const slider = clone.querySelector('.reading-slider');
        const currPageEl = clone.querySelector('.curr-page');
        const goalEl = clone.querySelector('.goal-page');
        
        slider.max = routine.totalPages;
        slider.value = routine.currentPage;
        currPageEl.innerText = routine.currentPage;
        goalEl.innerText = routine.totalPages; // Or dailyGoalPages

        slider.addEventListener('input', (e) => {
            routine.currentPage = parseInt(e.target.value);
            currPageEl.innerText = routine.currentPage;
            this.saveState();
        });

        container.appendChild(clone);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new FocusOS();
});

// Placeholder for FAB
function toggleAddMenu() {
    alert("Add Task feature coming soon!");
}
