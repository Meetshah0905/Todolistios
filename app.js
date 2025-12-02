const STORAGE_KEY = 'celestial_tasks_v1';
const AVAILABLE_KEY = 'celestial_available_hours';

class TaskBoard {
    constructor() {
        this.state = {
            tasks: [],
            filter: 'all',
            editingId: null,
            selectedDate: this.getTodayDateString(), // YYYY-MM-DD format
            availableHoursMap: this.loadAvailableHours(),
            movingTaskId: null,
            moveCalendarDate: new Date(),
        };
        this.elements = this.cacheElements();
        this.bindEvents();
        this.load();
        this.updateDateDisplay();
        this.render();
    }

    // Get today's date as YYYY-MM-DD string
    getTodayDateString() {
        const today = new Date();
        return this.formatDateString(today);
    }

    // Format Date object to YYYY-MM-DD string
    formatDateString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Parse YYYY-MM-DD string to Date object
    parseDateString(dateString) {
        const [year, month, day] = dateString.split('-').map(Number);
        return new Date(year, month - 1, day);
    }

    // Format date for display (e.g., "16th Nov", "17 Nov 2025")
    formatDateDisplay(dateString) {
        const date = this.parseDateString(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const todayStr = this.formatDateString(today);
        const tomorrowStr = this.formatDateString(tomorrow);
        const yesterdayStr = this.formatDateString(yesterday);

        if (dateString === todayStr) {
            return 'Today';
        } else if (dateString === tomorrowStr) {
            return 'Tomorrow';
        } else if (dateString === yesterdayStr) {
            return 'Yesterday';
        }

        const day = date.getDate();
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = monthNames[date.getMonth()];
        const year = date.getFullYear();
        const currentYear = today.getFullYear();

        // Add ordinal suffix (1st, 2nd, 3rd, 4th, etc.)
        const getOrdinal = (n) => {
            const s = ['th', 'st', 'nd', 'rd'];
            const v = n % 100;
            // Handle 11th, 12th, 13th specially (they use 'th')
            if (v >= 11 && v <= 13) {
                return n + 'th';
            }
            // Otherwise use the last digit
            const lastDigit = n % 10;
            return n + (s[lastDigit] || 'th');
        };

        if (year === currentYear) {
            return `${getOrdinal(day)} ${month}`;
        } else {
            return `${getOrdinal(day)} ${month} ${year}`;
        }
    }

    cacheElements() {
        return {
            form: document.getElementById('taskForm'),
            title: document.getElementById('taskTitle'),
            note: document.getElementById('taskNote'),
            hours: document.getElementById('taskHours'),
            minutes: document.getElementById('taskMinutes'),
            addBtn: document.getElementById('addTaskBtn'),
            list: document.getElementById('taskList'),
            empty: document.getElementById('emptyState'),
            template: document.getElementById('taskTemplate'),
            progressFill: document.getElementById('progressFill'),
            progressPercent: document.getElementById('progressPercent'),
            progressMeta: document.getElementById('progressMeta'),
            filters: document.querySelectorAll('.filter-chip'),
            priorityChips: document.querySelectorAll('.priority-chip'),
            celebration: document.getElementById('celebration'),
            celebrationClose: document.getElementById('celebrationClose'),
            fab: document.getElementById('fabAdd'),
            datePrev: document.getElementById('datePrev'),
            dateToday: document.getElementById('dateToday'),
            dateNext: document.getElementById('dateNext'),
            dateDisplay: document.getElementById('dateDisplay'),
            timeTotal: document.getElementById('timeTotal'),
            timeRemaining: document.getElementById('timeRemaining'),
            remainingSlot: document.getElementById('remainingSlot'),
            availableInput: document.getElementById('availableHoursInput'),
            movePanel: document.getElementById('movePanel'),
            moveClose: document.getElementById('moveClose'),
            moveDateInput: document.getElementById('moveDateInput'),
            moveTodayBtn: document.getElementById('moveTodayBtn'),
            moveConfirmBtn: document.getElementById('moveConfirmBtn'),
            calendarMonthLabel: document.getElementById('calendarMonthLabel'),
            calendarGrid: document.getElementById('calendarGrid'),
            calendarPrev: document.getElementById('calendarPrev'),
            calendarNext: document.getElementById('calendarNext'),
        };
    }

    bindEvents() {
        if (!this.elements.form) {
            console.error('Task form not found!');
            return;
        }
        
        this.elements.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.state.editingId ? this.saveEdit() : this.addTask();
        });
        
        // Backup click handler for the button
        if (this.elements.addBtn) {
            this.elements.addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (!this.state.editingId) {
                    this.addTask();
                }
            });
        }

        this.elements.filters.forEach(chip =>
            chip.addEventListener('click', () => this.setFilter(chip.dataset.filter)));

        this.elements.priorityChips.forEach(chip =>
            chip.addEventListener('click', () => this.setPriority(chip)));

        // Celebration modal event listeners removed

        this.elements.fab.addEventListener('click', () => {
            this.elements.title.focus();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Date navigation
        this.elements.datePrev.addEventListener('click', () => this.navigateDate(-1));
        this.elements.dateToday.addEventListener('click', () => this.goToToday());
        this.elements.dateNext.addEventListener('click', () => this.navigateDate(1));

        if (this.elements.availableInput) {
            this.elements.availableInput.addEventListener('input', () => {
                const value = parseFloat(this.elements.availableInput.value);
                const safe = isNaN(value) || value < 0 ? 0 : value;
                this.setAvailableHoursForDate(this.state.selectedDate, safe);
                this.updateTimeSummary();
            });
        }

        if (this.elements.moveDateInput) {
            this.elements.moveDateInput.addEventListener('change', () => {
                const value = this.elements.moveDateInput.value;
                if (value) {
                    this.state.moveCalendarDate = this.parseDateString(value);
                    this.renderMoveCalendar();
                }
            });
        }

        if (this.elements.moveClose) {
            this.elements.moveClose.addEventListener('click', () => this.closeMovePanel());
        }

        if (this.elements.movePanel) {
            this.elements.movePanel.addEventListener('click', (e) => {
                if (e.target === this.elements.movePanel) this.closeMovePanel();
            });
        }

        if (this.elements.moveTodayBtn) {
            this.elements.moveTodayBtn.addEventListener('click', () => {
                this.submitMove(this.getTodayDateString());
            });
        }

        if (this.elements.moveConfirmBtn) {
            this.elements.moveConfirmBtn.addEventListener('click', () => {
                const value = this.elements.moveDateInput?.value;
                if (value) {
                    this.submitMove(value);
                }
            });
        }

        if (this.elements.calendarPrev) {
            this.elements.calendarPrev.addEventListener('click', () => this.shiftMoveCalendarMonth(-1));
        }

        if (this.elements.calendarNext) {
            this.elements.calendarNext.addEventListener('click', () => this.shiftMoveCalendarMonth(1));
        }

        if (this.elements.calendarGrid) {
            this.elements.calendarGrid.addEventListener('click', (event) => {
                const target = event.target.closest('button[data-date]');
                if (!target) return;
                const dateValue = target.dataset.date;
                if (!dateValue) return;
                this.elements.moveDateInput.value = dateValue;
                this.state.moveCalendarDate = this.parseDateString(dateValue);
                this.renderMoveCalendar();
            });
        }
    }

    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                this.state.tasks = JSON.parse(data);
                // Backward compatibility: assign today's date to tasks without a date
                const todayStr = this.getTodayDateString();
                this.state.tasks.forEach(task => {
                    if (!task.date) {
                        task.date = todayStr;
                    }
                });
                this.save(); // Save updated tasks with dates
            }
        } catch (err) {
            console.error('Failed to load tasks', err);
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.tasks));
    }

    loadAvailableHours() {
        const stored = localStorage.getItem(AVAILABLE_KEY);
        if (!stored) return {};
        try {
            const parsed = JSON.parse(stored);
            if (typeof parsed === 'number') {
                return { [this.getTodayDateString()]: parsed };
            }
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch (err) {
            console.warn('Failed to parse available hours map', err);
        }
        return {};
    }

    saveAvailableHours() {
        localStorage.setItem(AVAILABLE_KEY, JSON.stringify(this.state.availableHoursMap));
    }

    getAvailableHoursForDate(dateString) {
        return this.state.availableHoursMap[dateString] ?? 0;
    }

    setAvailableHoursForDate(dateString, hours) {
        this.state.availableHoursMap[dateString] = hours;
        this.saveAvailableHours();
    }

    getSelectedPriority() {
        const active = document.querySelector('.priority-chip.active');
        return active ? active.dataset.priority : 'IU';
    }

    setPriority(chip) {
        this.elements.priorityChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
    }

    addTask() {
        if (!this.elements.title) {
            console.error('Task title input not found!');
            return;
        }
        
        const title = this.elements.title.value.trim();
        if (!title) {
            // Show validation feedback
            this.elements.title.focus();
            this.elements.title.style.borderColor = '#ff7878';
            setTimeout(() => {
                if (this.elements.title) {
                    this.elements.title.style.borderColor = '';
                }
            }, 2000);
            return;
        }

        // Get tasks for current date to calculate order
        const dateTasks = this.getTasksForDate(this.state.selectedDate);
        const order = dateTasks.length;

        const task = {
            id: crypto.randomUUID(),
            title,
            note: this.elements.note ? this.elements.note.value.trim() : '',
            priority: this.getSelectedPriority(),
            hours: this.elements.hours ? Number(this.elements.hours.value) || 0 : 0,
            minutes: this.elements.minutes ? Number(this.elements.minutes.value) || 0 : 25,
            done: false,
            cancelled: false,
            date: this.state.selectedDate, // Store task with selected date
            createdAt: Date.now(),
            order: order,
        };

        this.state.tasks.push(task);
        this.save();
        this.resetForm();
        this.render();
        this.elements.list.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    resetForm() {
        if (this.elements.form) {
            this.elements.form.reset();
        }
        if (this.elements.addBtn) {
            this.elements.addBtn.textContent = 'Add Task';
            this.elements.addBtn.disabled = false;
        }
        this.state.editingId = null;
        if (this.elements.priorityChips && this.elements.priorityChips.length > 0) {
            this.elements.priorityChips.forEach(chip => chip.classList.remove('active'));
            this.elements.priorityChips[0].classList.add('active');
        }
        // Reset minutes to default
        if (this.elements.minutes) {
            this.elements.minutes.value = 25;
        }
        if (this.elements.hours) {
            this.elements.hours.value = 0;
        }
    }

    setFilter(filter) {
        this.state.filter = filter;
        this.elements.filters.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === filter);
        });
        this.render();
    }

    // Get tasks for a specific date
    getTasksForDate(dateString) {
        return this.state.tasks.filter(t => t.date === dateString || (!t.date && dateString === this.getTodayDateString()));
    }

    filteredTasks() {
        // First filter by selected date
        let tasks = this.getTasksForDate(this.state.selectedDate);

        // Then apply status/priority filter
        switch (this.state.filter) {
            case 'active':
                return tasks.filter(t => !t.done && !t.cancelled);
            case 'done':
                return tasks.filter(t => t.done);
            case 'cancelled':
                return tasks.filter(t => t.cancelled);
            case 'high':
                return tasks.filter(t => t.priority === 'IU' || t.priority === 'IBNU');
            default:
                return tasks;
        }
    }

    // Date navigation methods
    navigateDate(days) {
        const currentDate = this.parseDateString(this.state.selectedDate);
        currentDate.setDate(currentDate.getDate() + days);
        this.state.selectedDate = this.formatDateString(currentDate);
        this.updateDateDisplay();
        this.render();
    }

    goToToday() {
        this.state.selectedDate = this.getTodayDateString();
        this.updateDateDisplay();
        this.render();
    }

    updateDateDisplay() {
        this.elements.dateDisplay.textContent = this.formatDateDisplay(this.state.selectedDate);
    }

    render() {
        const tasks = this.filteredTasks().sort((a, b) => a.order - b.order);
        this.elements.list.innerHTML = '';
        tasks.forEach((task, index) => {
            const element = this.createTaskElement(task);
            element.style.setProperty('--task-index', index);
            this.elements.list.appendChild(element);
        });
        this.elements.empty.style.display = tasks.length ? 'none' : 'block';
        this.updateProgress();
        this.updateTimeSummary();
    }

    createTaskElement(task) {
        const fragment = this.elements.template.content.cloneNode(true);
        const item = fragment.querySelector('.task-item');
        item.dataset.id = task.id;

        item.querySelector('.task-title').textContent = task.title;
        item.querySelector('.task-note').textContent = task.note || 'No notes yet.';
        item.querySelector('.task-pill').textContent = task.priority;
        item.querySelector('.task-duration').textContent = this.formatDuration(task.hours, task.minutes);
        item.querySelector('.task-created').textContent =
            `Added ${new Date(task.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        const checkbox = item.querySelector('.task-checkbox');
        checkbox.classList.toggle('completed', task.done);
        checkbox.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleTask(task.id);
        });

        item.querySelector('.task-edit').addEventListener('click', (e) => {
            e.stopPropagation();
            this.populateEdit(task.id);
        });

        item.querySelector('.task-move').addEventListener('click', (e) => {
            e.stopPropagation();
            this.openMovePanel(task.id);
        });

        item.querySelector('.task-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            this.deleteTask(task.id);
        });

        item.addEventListener('dragstart', (e) => this.handleDragStart(e, task.id));
        item.addEventListener('dragover', (e) => this.handleDragOver(e, task.id));
        item.addEventListener('drop', (e) => this.handleDrop(e, task.id));
        item.addEventListener('dragend', () => this.handleDragEnd());

        return item;
    }

    formatDuration(hours, minutes) {
        const h = Number(hours) || 0;
        const m = Number(minutes) || 0;
        if (!h && !m) return 'No estimate';
        const parts = [];
        if (h) parts.push(`${h}h`);
        if (m) parts.push(`${m}m`);
        return parts.join(' ');
    }

    toggleTask(id) {
        this.state.tasks = this.state.tasks.map(task =>
            task.id === id ? { ...task, done: !task.done, cancelled: false } : task
        );
        this.save();
        this.render();
    }

    populateEdit(id) {
        const task = this.state.tasks.find(t => t.id === id);
        if (!task) return;
        this.state.editingId = id;
        this.elements.title.value = task.title;
        this.elements.note.value = task.note;
        this.elements.hours.value = task.hours;
        this.elements.minutes.value = task.minutes;
        this.elements.addBtn.textContent = 'Save Changes';
        this.elements.priorityChips.forEach(chip => {
            chip.classList.toggle('active', chip.dataset.priority === task.priority);
        });
        this.elements.title.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    saveEdit() {
        const id = this.state.editingId;
        if (!id) return;
        this.state.tasks = this.state.tasks.map(task =>
            task.id === id ? {
                ...task,
                title: this.elements.title.value.trim(),
                note: this.elements.note.value.trim(),
                hours: Number(this.elements.hours.value) || 0,
                minutes: Number(this.elements.minutes.value) || 0,
                priority: this.getSelectedPriority(),
            } : task
        );
        this.save();
        this.resetForm();
        this.render();
    }

    deleteTask(id) {
        const task = this.state.tasks.find(t => t.id === id);
        if (!task) return;

        this.state.tasks = this.state.tasks.filter(t => t.id !== id);

        // Reorder remaining tasks for the same date
        this.reorderDateTasks(task.date);

        this.save();
        this.render();
    }

    updateProgress() {
        // Only count tasks for the selected date
        const dateTasks = this.getTasksForDate(this.state.selectedDate);
        const total = dateTasks.length;
        const done = dateTasks.filter(t => t.done).length;
        const active = dateTasks.filter(t => !t.done && !t.cancelled).length;
        const cancelled = dateTasks.filter(t => t.cancelled).length;
        const percent = total ? Math.round((done / total) * 100) : 0;

        this.elements.progressFill.style.width = `${percent}%`;
        this.elements.progressPercent.textContent = `${percent}%`;
        this.elements.progressFill.setAttribute('aria-valuenow', percent);
        this.elements.progressMeta.textContent = `Total ${total} • Active ${active} • Done ${done} • Cancelled ${cancelled}`;

        // Add glow effect to day when all tasks are completed
        const taskListWrapper = document.querySelector('.task-list-wrapper');
        if (taskListWrapper) {
            if (percent === 100 && total) {
                taskListWrapper.classList.add('day-completed');
            } else {
                taskListWrapper.classList.remove('day-completed');
            }
        }
    }

    updateTimeSummary() {
        if (!this.elements.timeTotal || !this.elements.availableInput) return;
        const totalMinutes = this.getActiveMinutesForDate(this.state.selectedDate);
        const availableHours = this.getAvailableHoursForDate(this.state.selectedDate);
        const availableMinutes = Math.round((availableHours || 0) * 60);
        const remainingMinutes = availableMinutes - totalMinutes;

        this.elements.timeTotal.textContent = this.formatMinutes(totalMinutes);
        this.elements.timeRemaining.textContent = this.formatMinutes(remainingMinutes);
        this.elements.availableInput.value = availableHours.toString();
        this.elements.remainingSlot.classList.toggle('negative', remainingMinutes < 0);
    }

    getActiveMinutesForDate(dateString) {
        return this.getTasksForDate(dateString)
            .filter(task => !task.cancelled)
            .reduce((sum, task) => sum + this.taskMinutes(task), 0);
    }

    taskMinutes(task) {
        const hours = Number(task.hours) || 0;
        const minutes = Number(task.minutes) || 0;
        return (hours * 60) + minutes;
    }

    formatMinutes(totalMinutes) {
        const sign = totalMinutes < 0 ? '-' : '';
        const abs = Math.abs(totalMinutes);
        const hours = Math.floor(abs / 60);
        const minutes = abs % 60;
        if (!hours && !minutes) return '0m';
        if (!hours) return `${sign}${minutes}m`;
        if (!minutes) return `${sign}${hours}h`;
        return `${sign}${hours}h ${minutes}m`;
    }

    openMovePanel(taskId) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task || !this.elements.movePanel) return;
        this.state.movingTaskId = taskId;
        const dateValue = task.date || this.state.selectedDate || this.getTodayDateString();
        if (this.elements.moveDateInput) {
            this.elements.moveDateInput.value = dateValue;
        }
        this.state.moveCalendarDate = this.parseDateString(dateValue);
        this.renderMoveCalendar();
        this.elements.movePanel.classList.add('active');
        this.elements.movePanel.setAttribute('aria-hidden', 'false');
    }

    closeMovePanel() {
        if (!this.elements.movePanel) return;
        this.state.movingTaskId = null;
        this.elements.movePanel.classList.remove('active');
        this.elements.movePanel.setAttribute('aria-hidden', 'true');
    }

    submitMove(dateString) {
        if (!this.state.movingTaskId || !dateString) return;
        this.moveTaskToDate(this.state.movingTaskId, dateString);
        this.closeMovePanel();
    }

    moveTaskToDate(taskId, targetDate) {
        const task = this.state.tasks.find(t => t.id === taskId);
        if (!task) return;
        const previousDate = task.date;
        const targetTasks = this.state.tasks
            .filter(t => t.date === targetDate && t.id !== taskId)
            .sort((a, b) => a.order - b.order);
        const newOrder = targetTasks.length;

        this.state.tasks = this.state.tasks.map(t =>
            t.id === taskId ? { ...t, date: targetDate, order: newOrder } : t
        );

        if (previousDate) {
            this.reorderDateTasks(previousDate);
        }
        this.reorderDateTasks(targetDate);
        this.save();
        this.render();
    }

    reorderDateTasks(dateString) {
        if (!dateString) return;
        const tasks = this.state.tasks
            .filter(t => t.date === dateString)
            .sort((a, b) => a.order - b.order);
        tasks.forEach((task, index) => task.order = index);
    }

    shiftMoveCalendarMonth(delta) {
        const base = new Date(this.state.moveCalendarDate);
        base.setDate(1);
        base.setMonth(base.getMonth() + delta);
        this.state.moveCalendarDate = base;
        this.renderMoveCalendar();
    }

    renderMoveCalendar() {
        if (!this.elements.calendarGrid || !this.elements.calendarMonthLabel) return;
        const base = new Date(this.state.moveCalendarDate);
        const year = base.getFullYear();
        const month = base.getMonth();
        this.elements.calendarMonthLabel.textContent = base.toLocaleString(undefined, {
            month: 'long',
            year: 'numeric',
        });

        const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevMonthDays = new Date(year, month, 0).getDate();
        const selectedDate = this.elements.moveDateInput?.value;
        const todayStr = this.getTodayDateString();

        const fragment = document.createDocumentFragment();

        // Leading blanks (previous month)
        for (let i = 0; i < firstDayIndex; i++) {
            const dayNumber = prevMonthDays - firstDayIndex + i + 1;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = dayNumber;
            btn.classList.add('other-month');
            btn.disabled = true;
            fragment.appendChild(btn);
        }

        // Current month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateObj = new Date(year, month, day);
            const dateString = this.formatDateString(dateObj);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = day;
            btn.dataset.date = dateString;
            if (dateString === selectedDate) btn.classList.add('selected');
            if (dateString === todayStr) btn.classList.add('today');
            fragment.appendChild(btn);
        }

        // Trailing blanks to fill last week
        const totalCells = firstDayIndex + daysInMonth;
        const trailing = (7 - (totalCells % 7)) % 7;
        for (let i = 1; i <= trailing; i++) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.textContent = i;
            btn.classList.add('other-month');
            btn.disabled = true;
            fragment.appendChild(btn);
        }

        this.elements.calendarGrid.innerHTML = '';
        this.elements.calendarGrid.appendChild(fragment);
    }

    // Celebration modal removed - using day glow effect instead

    // Drag logic
    handleDragStart(e, id) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
        e.currentTarget.classList.add('dragging');
    }

    handleDragOver(e, targetId) {
        e.preventDefault();
        const draggingId = e.dataTransfer.getData('text/plain');
        if (!draggingId || draggingId === targetId) return;

        // Only reorder tasks for the current date
        const dateTasks = this.getTasksForDate(this.state.selectedDate);
        const draggingIndex = dateTasks.findIndex(t => t.id === draggingId);
        const targetIndex = dateTasks.findIndex(t => t.id === targetId);
        if (draggingIndex === -1 || targetIndex === -1) return;

        // Update order within date tasks
        const [dragged] = dateTasks.splice(draggingIndex, 1);
        dateTasks.splice(targetIndex, 0, dragged);
        dateTasks.forEach((task, idx) => task.order = idx);

        this.save();
        this.render();
    }

    handleDrop(e) {
        e.preventDefault();
        this.handleDragEnd();
        this.save();
    }

    handleDragEnd() {
        document.querySelectorAll('.task-item.dragging')
            .forEach(el => el.classList.remove('dragging'));
    }
}

document.addEventListener('DOMContentLoaded', () => new TaskBoard());

