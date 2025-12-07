document.addEventListener('DOMContentLoaded', () => {
    
    const DB_KEY = 'focusOS_v4';

    const defaultData = {
        balance: 0,
        tasks: [],
        books: [],
        wishlist: []
    };

    class App {
        constructor() {
            this.data = JSON.parse(localStorage.getItem(DB_KEY)) || defaultData;
            this.cacheDOM();
            this.bindEvents();
            this.renderAll();
        }

        cacheDOM() {
            this.dom = {
                balance: document.getElementById('userBalance'),
                taskInput: document.getElementById('taskInput'),
                taskNote: document.getElementById('taskNote'),
                taskHrs: document.getElementById('taskHrs'),
                taskMins: document.getElementById('taskMins'),
                aiBadge: document.getElementById('aiSuggestion'),
                aiPoints: document.getElementById('aiPoints'),
                taskList: document.getElementById('taskList'),
                bookGrid: document.getElementById('bookGrid'),
                wishGrid: document.getElementById('wishGrid'),
                bookModal: document.getElementById('bookModal'),
                wishInput: document.getElementById('wishInput'),
                wishCost: document.getElementById('wishCost')
            };
        }

        bindEvents() {
            // Navigation
            document.querySelectorAll('.nav-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const target = btn.dataset.target;
                    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
                    document.getElementById(target).classList.add('active');
                });
            });

            // Buttons
            document.getElementById('addTaskBtn').addEventListener('click', () => this.addTask());
            document.getElementById('addWishBtn').addEventListener('click', () => this.addWishItem());
            document.getElementById('openBookModalBtn').addEventListener('click', () => this.dom.bookModal.classList.add('open'));
            document.getElementById('closeBookModalBtn').addEventListener('click', () => this.dom.bookModal.classList.remove('open'));
            document.getElementById('confirmAddBookBtn').addEventListener('click', () => this.addBook());
            document.getElementById('resetDataBtn').addEventListener('click', () => {
                if(confirm("Reset all data?")) { localStorage.clear(); location.reload(); }
            });

            // AI Logic Listeners
            this.dom.taskInput.addEventListener('input', () => this.updateAi());
            this.dom.taskHrs.addEventListener('input', () => this.updateAi());
            this.dom.taskMins.addEventListener('input', () => this.updateAi());

            // Tag Selection
            document.querySelectorAll('.tag-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
                    e.target.classList.add('active');
                });
            });
        }

        // --- THE "AI" LOGIC ---
        calculatePoints(text, hrs, mins) {
            if(!text) return 0;
            text = text.toLowerCase();
            let points = 20; // Base value

            // 1. Time based points (1 min = 1 point)
            const duration = (parseInt(hrs)||0) * 60 + (parseInt(mins)||0);
            points += duration;

            // 2. Keyword suggestions (The "AI" part)
            if (text.includes('walk') || text.includes('run') || text.includes('steps')) {
                if(text.includes('10000') || text.includes('10k')) points += 500; // Big goal!
                else points += 100;
            }
            if (text.includes('clean') || text.includes('wash') || text.includes('tidy')) points += 30; // Chores
            if (text.includes('read') || text.includes('study')) points += 80; // Education
            if (text.includes('code') || text.includes('project')) points += 150; // Work
            if (text.includes('water') || text.includes('meditate')) points += 40; // Health

            return points;
        }

        updateAi() {
            const points = this.calculatePoints(
                this.dom.taskInput.value, 
                this.dom.taskHrs.value, 
                this.dom.taskMins.value
            );
            
            if (points > 0) {
                this.dom.aiBadge.style.display = 'block';
                this.dom.aiPoints.innerText = points;
            } else {
                this.dom.aiBadge.style.display = 'none';
            }
        }

        // --- CORE FUNCTIONS ---
        addTask() {
            const title = this.dom.taskInput.value;
            if(!title) return alert("Enter a task title!");

            const points = this.calculatePoints(title, this.dom.taskHrs.value, this.dom.taskMins.value);
            const priority = document.querySelector('.tag-btn.active')?.dataset.priority || 'Normal';

            this.data.tasks.push({
                id: Date.now(),
                title,
                note: this.dom.taskNote.value,
                time: `${this.dom.taskHrs.value}h ${this.dom.taskMins.value}m`,
                points,
                priority
            });

            this.dom.taskInput.value = '';
            this.dom.taskNote.value = '';
            this.save();
        }

        completeTask(id) {
            const task = this.data.tasks.find(t => t.id === id);
            if(task) {
                this.data.balance += task.points;
                this.data.tasks = this.data.tasks.filter(t => t.id !== id);
                this.save();
                alert(`Task Done! Earned ${task.points} 🪙`);
            }
        }

        addBook() {
            const title = document.getElementById('bookTitle').value;
            const pages = document.getElementById('bookPages').value;
            if(!title || !pages) return;

            const colors = ['#FF2D55', '#5856D6', '#007AFF', '#30D158', '#FF9500'];
            this.data.books.push({
                id: Date.now(),
                title,
                author: document.getElementById('bookAuthor').value,
                totalPages: parseInt(pages),
                currPage: 0,
                color: colors[Math.floor(Math.random() * colors.length)],
                finished: false
            });
            this.dom.bookModal.classList.remove('open');
            this.save();
        }

        updateBook(id, val) {
            const book = this.data.books.find(b => b.id === id);
            if(book) {
                book.currPage = parseInt(val);
                if(book.currPage >= book.totalPages && !book.finished) {
                    book.finished = true;
                    this.data.balance += 500;
                    alert("Book Finished! +500 🪙");
                }
                this.save();
            }
        }

        addWishItem() {
            const name = this.dom.wishInput.value;
            const cost = parseInt(this.dom.wishCost.value);
            if(!name || !cost) return;

            this.data.wishlist.push({ id: Date.now(), title: name, cost, redeemed: false });
            this.dom.wishInput.value = '';
            this.dom.wishCost.value = '';
            this.save();
        }

        redeemItem(id) {
            const item = this.data.wishlist.find(i => i.id === id);
            if(item && this.data.balance >= item.cost) {
                if(confirm(`Buy ${item.title}?`)) {
                    this.data.balance -= item.cost;
                    item.redeemed = true;
                    this.save();
                }
            } else {
                alert("Not enough coins!");
            }
        }

        save() {
            localStorage.setItem(DB_KEY, JSON.stringify(this.data));
            this.renderAll();
        }

        renderAll() {
            this.dom.balance.innerText = this.data.balance.toLocaleString();
            
            // Render Tasks
            this.dom.taskList.innerHTML = '';
            this.data.tasks.forEach(t => {
                const div = document.createElement('div');
                div.className = 'task-item';
                div.innerHTML = `
                    <div class="task-info">
                        <h3>${t.title}</h3>
                        <div class="task-meta">
                            <span>${t.priority}</span> • <span>${t.time}</span> • <span class="task-points">+${t.points}🪙</span>
                        </div>
                    </div>
                    <div class="check-circle"></div>
                `;
                div.querySelector('.check-circle').addEventListener('click', () => this.completeTask(t.id));
                this.dom.taskList.appendChild(div);
            });

            // Render Books
            this.dom.bookGrid.innerHTML = '';
            this.data.books.forEach(b => {
                if(b.finished) return;
                const percent = Math.round((b.currPage / b.totalPages) * 100);
                const div = document.createElement('div');
                div.className = 'liquid-card';
                div.style.setProperty('--book-color', b.color);
                div.innerHTML = `
                    <div class="liquid-bg"></div>
                    <div class="book-content">
                        <div class="book-title">${b.title}</div>
                        <input type="range" class="book-slider" min="0" max="${b.totalPages}" value="${b.currPage}">
                        <div class="book-stats"><span>${percent}%</span><span>${b.currPage}/${b.totalPages}</span></div>
                    </div>
                `;
                div.querySelector('input').addEventListener('input', (e) => this.updateBook(b.id, e.target.value));
                this.dom.bookGrid.appendChild(div);
            });

            // Render Wishlist
            this.dom.wishGrid.innerHTML = '';
            this.data.wishlist.forEach(w => {
                if(w.redeemed) return;
                const canAfford = this.data.balance >= w.cost;
                const div = document.createElement('div');
                div.className = 'wish-card';
                div.innerHTML = `
                    <div><h3>${w.title}</h3><span style="color:var(--gold)">${w.cost} 🪙</span></div>
                    <button class="buy-btn ${canAfford ? 'can-afford' : ''}">${canAfford ? 'Buy' : 'Locked'}</button>
                `;
                div.querySelector('button').addEventListener('click', () => this.redeemItem(w.id));
                this.dom.wishGrid.appendChild(div);
            });
        }
    }

    window.app = new App();
});
