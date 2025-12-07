const DB_KEY = 'focusOS_gamified_v1';

const defaultData = {
    balance: 0,
    tasks: [],
    books: [], // { id, title, author, totalPages, currPage, color, isFinished }
    wishlist: [] // { id, title, cost, redeemed }
};

class App {
    constructor() {
        this.data = JSON.parse(localStorage.getItem(DB_KEY)) || defaultData;
        this.currentView = 'view-tasks';
        this.init();
    }

    init() {
        this.renderBalance();
        this.renderTasks();
        this.renderBooks();
        this.renderWishlist();
        this.updateDate();
    }

    save() {
        localStorage.setItem(DB_KEY, JSON.stringify(this.data));
        this.renderBalance(); // Always update balance on save
        this.renderWishlist(); // Re-check affordability
    }

    updateDate() {
        const d = new Date();
        document.getElementById('currentDate').innerText = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    switchView(viewId) {
        // Update DOM
        document.querySelectorAll('.app-view').forEach(el => el.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        // Update Nav
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        const index = ['view-tasks', 'view-library', 'view-wishlist'].indexOf(viewId);
        document.querySelectorAll('.nav-item')[index].classList.add('active');
    }

    renderBalance() {
        // Animation for numbers
        const el = document.getElementById('userBalance');
        el.innerText = this.data.balance.toLocaleString();
    }

    /* --- TASK LOGIC --- */
    addTask() {
        const input = document.getElementById('taskInput');
        const priorityBtn = document.querySelector('.tag-btn.active');
        
        if(!input.value) return;

        this.data.tasks.push({
            id: Date.now(),
            title: input.value,
            priority: priorityBtn ? priorityBtn.dataset.priority : 'Normal',
            completed: false
        });

        input.value = '';
        this.save();
        this.renderTasks();
    }

    completeTask(id) {
        const task = this.data.tasks.find(t => t.id === id);
        if(task) {
            this.data.tasks = this.data.tasks.filter(t => t.id !== id);
            this.data.balance += 50; // REWARD: 50 coins per task
            this.save();
            this.renderTasks();
            alert(`Task Complete! +50 🪙`);
        }
    }

    renderTasks() {
        const list = document.getElementById('taskList');
        list.innerHTML = '';
        this.data.tasks.forEach(task => {
            list.innerHTML += `
                <div class="task-item">
                    <div class="task-info">
                        <h3>${task.title}</h3>
                        <span>${task.priority}</span>
                    </div>
                    <div class="check-circle" onclick="app.completeTask(${task.id})"></div>
                </div>
            `;
        });
    }

    /* --- LIBRARY LOGIC --- */
    toggleBookModal() {
        document.getElementById('bookModal').classList.toggle('open');
    }

    addBook() {
        const title = document.getElementById('bookTitle').value;
        const author = document.getElementById('bookAuthor').value;
        const pages = document.getElementById('bookPages').value;

        if(!title || !pages) return;

        // Random neon color for liquid effect
        const colors = ['#FF2D55', '#5856D6', '#007AFF', '#30D158', '#FF9500', '#FFD60A'];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        this.data.books.push({
            id: Date.now(),
            title, author, 
            totalPages: parseInt(pages), 
            currPage: 0,
            color: randomColor,
            isFinished: false
        });

        this.toggleBookModal();
        this.save();
        this.renderBooks();
    }

    updatePageProgress(id, value) {
        const book = this.data.books.find(b => b.id === id);
        if(book) {
            book.currPage = parseInt(value);
            
            // Check for completion
            if(book.currPage >= book.totalPages && !book.isFinished) {
                book.isFinished = true;
                book.currPage = book.totalPages;
                this.data.balance += 500; // BIG REWARD
                alert(`Book Finished! +500 🪙`);
            }
            this.save();
            this.renderBooks(); // Re-render to update UI text
        }
    }

    renderBooks() {
        const grid = document.getElementById('bookGrid');
        grid.innerHTML = '';
        this.data.books.forEach(book => {
            if(book.isFinished) return; // Optional: hide finished books or move to archive

            const percent = Math.round((book.currPage / book.totalPages) * 100);
            
            grid.innerHTML += `
                <div class="liquid-card" style="--book-color: ${book.color}">
                    <div class="liquid-bg"></div>
                    <div class="book-content">
                        <div class="book-title">${book.title}</div>
                        <div class="book-author">${book.author}</div>
                        
                        <input type="range" class="book-slider" 
                            min="0" max="${book.totalPages}" value="${book.currPage}"
                            onchange="app.updatePageProgress(${book.id}, this.value)">
                        
                        <div class="book-stats">
                            <span>${percent}%</span>
                            <span>${book.currPage}/${book.totalPages} p</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    /* --- WISHLIST LOGIC --- */
    addWishItem() {
        const name = document.getElementById('wishInput').value;
        const cost = parseInt(document.getElementById('wishCost').value);

        if(!name || !cost) return;

        this.data.wishlist.push({ id: Date.now(), title: name, cost: cost, redeemed: false });
        this.save();
        this.renderWishlist();
    }

    redeemItem(id) {
        const item = this.data.wishlist.find(i => i.id === id);
        if(item && this.data.balance >= item.cost) {
            if(confirm(`Buy ${item.title} for ${item.cost} coins?`)) {
                this.data.balance -= item.cost;
                item.redeemed = true;
                this.save();
                this.renderWishlist();
                alert('Item Redeemed! Treat yourself.');
            }
        }
    }

    renderWishlist() {
        const grid = document.getElementById('wishGrid');
        grid.innerHTML = '';

        this.data.wishlist.forEach(item => {
            if(item.redeemed) return; // Hide purchased items

            const canAfford = this.data.balance >= item.cost;
            const btnClass = canAfford ? 'buy-btn can-afford' : 'buy-btn';
            const btnText = canAfford ? 'Buy' : 'Locked';

            grid.innerHTML += `
                <div class="wish-card">
                    <div class="wish-details">
                        <h3>${item.title}</h3>
                        <span class="wish-cost">${item.cost.toLocaleString()} 🪙</span>
                    </div>
                    <button class="${btnClass}" onclick="app.redeemItem(${item.id})">${btnText}</button>
                </div>
            `;
        });
    }
}

// Logic for Tag Selection in Task View
document.querySelectorAll('.tag-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tag-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
    });
});

const app = new App();
