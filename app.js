const DB_KEY = 'focusOS_v2';

// DEFAULT STATE
const defaultData = {
    balance: 0,
    tasks: [],
    books: [],
    wishlist: []
};

class App {
    constructor() {
        this.data = JSON.parse(localStorage.getItem(DB_KEY)) || defaultData;
        this.currentView = 'view-tasks';
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.renderAll();
    }

    cacheDOM() {
        this.dom = {
            balance: document.getElementById('userBalance'),
            date: document.getElementById('currentDate'),
            taskInput: document.getElementById('taskInput'),
            taskNote: document.getElementById('taskNote'),
            taskHrs: document.getElementById('taskHrs'),
            taskMins: document.getElementById('taskMins'),
            aiBadge: document.getElementById('aiSuggestion'),
            aiPoints: document.getElementById('aiPoints'),
            taskList: document.getElementById('taskList'),
            bookGrid: document.getElementById('bookGrid'),
            wishGrid: document.getElementById('wishGrid'),
            bookModal: document.getElementById('bookModal')
        };
    }

    bindEvents() {
        // Tab Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = btn.closest('.nav-item').dataset.target;
                this.switchView(targetId);
            });
        });

        // Add Task Button
        document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());

        // AI Point Calculation on Typing
        this.dom.taskInput.addEventListener('input', (e) => this.updateAiSuggestion(e.target.value));
        this.dom.taskHrs.addEventListener('input', () => this.updateAiSuggestion(this.dom.taskInput.value));
        this.dom.taskMins.addEventListener('input', () => this.updateAiSuggestion(this.dom.taskInput.value));

        // Priority Tags
        document.querySelectorAll('.tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Library & Wishlist Buttons
        document.getElementById('openBookModalBtn').addEventListener('click', () => this.dom.bookModal.classList.add('open'));
        document.getElementById('closeBookModalBtn').addEventListener('click', () => this.dom.bookModal.classList.remove('open'));
        document.getElementById('confirmAddBookBtn').addEventListener('click', () => this.addBook());
        document.getElementById('addWishBtn').addEventListener('click', () => this.addWishItem());
    }

    save() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
        this.renderAll();
    }

    renderAll() {
        this.dom.balance.innerText = this.data.balance.toLocaleString();
        this.renderTasks();
        this.renderBooks();
        this.renderWishlist();
        
        const d = new Date();
        this.dom.date.innerText = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    switchView(viewId) {
        document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        document.querySelector(`.nav-item[data-target="${viewId}"]`).classList.add('active');
    }

    // --- SMART AI POINTS LOGIC ---
    calculateSmartPoints(text, hrs, mins) {
        let points = 50; // Base points
        text = text.toLowerCase();
        
        // Duration Bonus
        const totalMins = (parseInt(hrs) || 0) * 60 + (parseInt(mins) || 0);
        if (totalMins > 0) points += totalMins; // 1 point per minute

        // Keyword Multipliers (Simulated AI)
        if (text.includes('walk') || text.includes('run') || text.includes('gym') || text.includes('workout')) points += 100;
        if (text.includes('steps')) points += 150; // High reward for steps
        if (text.includes('read') || text.includes('study') || text.includes('code')) points += 80;
        if (text.includes('clean') || text.includes('wash')) points += 30;
        if (text.includes('deep work')) points += 200;

        return points;
    }

    updateAiSuggestion(text) {
        if (!text) {
            this.dom.aiBadge.style.display = 'none';
            return;
        }
        const points = this.calculateSmartPoints(text, this.dom.taskHrs.value, this.dom.taskMins.value);
        this.dom.aiBadge.style.display = 'block';
        this.dom.aiPoints.innerText = points;
    }

    // --- TASK LOGIC ---
    addTask() {
        const title = this.dom.taskInput.value;
        if (!title) return;

        const points = this.calculateSmartPoints(title, this.dom.taskHrs.value, this.dom.taskMins.value);
        const priority = document.querySelector('.tag-btn.active').dataset.priority;
        const hrs = this.dom.taskHrs.value || 0;
        const mins = this.dom.taskMins.value || 0;

        this.data.tasks.push({
            id: Date.now(),
            title,
            note: this.dom.taskNote.value,
            points,
            priority,
            time: `${hrs}h ${mins}m`,
            completed: false
        });

        // Reset Inputs
        this.dom.taskInput.value = '';
        this.dom.taskNote.value = '';
        this.dom.aiBadge.style.display = 'none';
        
        this.save();
    }

    completeTask(id) {
        const task = this.data.tasks.find(t => t.id === id);
        if (task) {
            this.data.balance += task.points;
            this.data.tasks = this.data.tasks.filter(t => t.id !== id);
            this.save();
            alert(`Completed! +${task.points} 🪙`);
        }
    }

    renderTasks() {
        this.dom.taskList.innerHTML = '';
        this.data.tasks.forEach(task => {
            this.dom.taskList.innerHTML += `
                <div class="task-item">
                    <div class="task-info">
                        <h3>${task.title}</h3>
                        <div class="task-meta">
                            <span>${task.priority}</span> • <span>${task.time}</span> • <span class="task-points">+${task.points} 🪙</span>
                        </div>
                    </div>
                    <div class="check-circle" onclick="app.completeTask(${task.id})"></div>
                </div>
            `;
        });
    }

    // --- LIBRARY LOGIC ---
    addBook() {
        const title = document.getElementById('bookTitle').value;
        const pages = document.getElementById('bookPages').value;
        if (!title || !pages) return;

        const colors = ['#FF2D55', '#5856D6', '#007AFF', '#30D158', '#FF9500'];
        
        this.data.books.push({
            id: Date.now(),
            title, 
            author: document.getElementById('bookAuthor').value,
            totalPages: parseInt(pages),
            currPage: 0,
            color: colors[Math.floor(Math.random() * colors.length)]
        });

        this.dom.bookModal.classList.remove('open');
        this.save();
    }

    updateBookProgress(id, value) {
        const book = this.data.books.find(b => b.id === id);
        if (book) {
            book.currPage = parseInt(value);
            if (book.currPage >= book.totalPages) {
                // Reward for finishing book
                if (!book.finished) {
                    this.data.balance += 500;
                    book.finished = true;
                    alert("Book Finished! +500 🪙");
                }
            }
            this.save(); // Save progress but don't re-render entire grid to keep slider smooth
            this.renderBooksTextOnly();
        }
    }

    renderBooks() {
        this.dom.bookGrid.innerHTML = '';
        this.data.books.forEach(book => {
            if (book.finished) return; 
            const percent = Math.round((book.currPage / book.totalPages) * 100);
            
            this.dom.bookGrid.innerHTML += `
                <div class="liquid-card" style="--book-color: ${book.color}">
                    <div class="liquid-bg"></div>
                    <div class="book-content">
                        <div class="book-title">${book.title}</div>
                        <input type="range" class="book-slider" 
                            min="0" max="${book.totalPages}" value="${book.currPage}"
                            oninput="app.updateBookProgress(${book.id}, this.value)">
                        <div class="book-stats" id="stats-${book.id}">
                            <span>${percent}%</span><span>${book.currPage}/${book.totalPages}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }
    
    renderBooksTextOnly() {
         this.data.books.forEach(book => {
            const el = document.getElementById(`stats-${book.id}`);
            if(el) {
                const percent = Math.round((book.currPage / book.totalPages) * 100);
                el.innerHTML = `<span>${percent}%</span><span>${book.currPage}/${book.totalPages}</span>`;
            }
         });
    }

    // --- WISHLIST LOGIC ---
    addWishItem() {
        const name = document.getElementById('wishInput').value;
        const cost = parseInt(document.getElementById('wishCost').value);
        if (!name || !cost) return;

        this.data.wishlist.push({ id: Date.now(), title: name, cost, redeemed: false });
        this.save();
    }

    redeemItem(id) {
        const item = this.data.wishlist.find(i => i.id === id);
        if (item && this.data.balance >= item.cost) {
            if (confirm(`Purchase ${item.title}?`)) {
                this.data.balance -= item.cost;
                item.redeemed = true;
                this.save();
                alert("Redeemed! Enjoy!");
            }
        }
    }

    renderWishlist() {
        this.dom.wishGrid.innerHTML = '';
        this.data.wishlist.forEach(item => {
            if (item.redeemed) return;
            const canAfford = this.data.balance >= item.cost;
            this.dom.wishGrid.innerHTML += `
                <div class="wish-card">
                    <div>
                        <h3>${item.title}</h3>
                        <span style="color:var(--gold)">${item.cost.toLocaleString()} 🪙</span>
                    </div>
                    <button class="buy-btn ${canAfford ? 'can-afford' : ''}" 
                        onclick="app.redeemItem(${item.id})">
                        ${canAfford ? 'Buy' : 'Locked'}
                    </button>
                </div>
            `;
        });
    }
}

const app = new App();
