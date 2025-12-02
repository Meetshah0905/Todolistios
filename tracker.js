(() => {
  const STORAGE_KEY = "liquid_habits_v1";

  const $ = (id) => document.getElementById(id);
  const pad2 = (n) => String(n).padStart(2, "0");
  const dateKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const monthKey = (y, m) => `${y}-${pad2(m + 1)}`;
  const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const startWeekday = (y, m) => new Date(y, m, 1).getDay();
  const weekdayShort = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { habits: [], completions: {} };
      const parsed = JSON.parse(raw);
      return {
        habits: Array.isArray(parsed.habits) ? parsed.habits : [],
        completions: parsed.completions && typeof parsed.completions === "object" ? parsed.completions : {}
      };
    } catch {
      return { habits: [], completions: {} };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function getCompletionFor(dateStr, habitId) {
    return !!(state.completions?.[dateStr]?.[habitId]?.done);
  }

  function setCompletionFor(dateStr, habitId, done) {
    if (!state.completions[dateStr]) state.completions[dateStr] = {};
    state.completions[dateStr][habitId] = { done: !!done };
    saveState();
  }

  const today = new Date();
  let viewYear = today.getFullYear();
  let viewMonth = today.getMonth();
  let currentWeek = 1; // Week index for mobile view (1-based)
  const state = loadState();

  // Check if mobile view (window width < 768px)
  function isMobile() {
    return window.innerWidth < 768;
  }

  const monthTitle = $("monthTitle");
  const prevMonthBtn = $("prevMonth");
  const nextMonthBtn = $("nextMonth");
  const jumpTodayBtn = $("jumpToday");

  const totalHabitsEl = $("totalHabits");
  const completedCountEl = $("completedCount");
  const monthProgressEl = $("monthProgress");
  const progressLabelEl = $("progressLabel");

  const gridWeeksEl = $("gridWeeks");
  const gridHeaderDaysEl = $("gridHeaderDays");
  const gridRowsEl = $("gridRows");
  const newHabitInputEl = $("newHabitInput");
  const addHabitInlineBtn = $("addHabitInline");
  const copyPrevBtn = $("copyPrevBtn");
  const toggleStatsBtn = $("toggleStatsBtn");
  const dashPanelsEl = $("dashPanels");
  const analysisPanelEl = $("analysisPanel");
  const mentalChartEl = $("mentalChart");
  const statsPanelEl = $("statsPanel");
  const statsCloseBtn = $("statsClose");
  const statsContentEl = $("statsContent");
  const confirmPanelEl = $("confirmPanel");
  const confirmCloseBtn = $("confirmClose");
  const confirmDeleteBtn = $("confirmDelete");
  const confirmCancelBtn = $("confirmCancel");
  let pendingDeleteId = null;

  const dayPanelEl = $("dayPanel");
  const dayHabitListEl = $("dayHabitList");
  const dayPrevBtn = $("dayPrev");
  const dayNextBtn = $("dayNext");
  const dayCloseBtn = $("dayClose");
  const dayLabelEl = $("dayLabel");
  let selectedDayIndex = null;

  const addHabitBtn = $("addHabitBtn");
  const habitModal = $("habitModal");
  const habitForm = $("habitForm");
  const habitIdEl = $("habitId");
  const habitNameEl = $("habitName");
  const habitIconEl = $("habitIcon");
  const habitGoalEl = $("habitGoal");
  const modalTitleEl = $("modalTitle");
  const cancelBtn = $("cancelBtn");
  const deleteBtn = $("deleteBtn");

  // Week navigation elements (created dynamically)
  let weekNavContainer = null;
  let weekPrevBtn = null;
  let weekNextBtn = null;
  let weekLabelEl = null;

  function formatMonthTitle(y, m) {
    const d = new Date(y, m, 1);
    return d.toLocaleString(undefined, { month: "long", year: "numeric" });
  }

  function calcMonthStats(y, m) {
    const totalDays = daysInMonth(y, m);
    const habits = state.habits;
    if (habits.length === 0) return { totalHabits: 0, completed: 0, possible: 0, percent: 0 };
    let completed = 0;
    let possible = habits.length * totalDays;
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(y, m, day);
      const key = dateKey(d);
      for (const h of habits) {
        if (getCompletionFor(key, h.id)) completed++;
      }
    }
    const percent = possible === 0 ? 0 : Math.round((completed / possible) * 100);
    return { totalHabits: habits.length, completed, possible, percent };
  }

  function renderHeader() {
    monthTitle.textContent = formatMonthTitle(viewYear, viewMonth);
  }

  function renderStats() {
    const stats = calcMonthStats(viewYear, viewMonth);
    totalHabitsEl.textContent = String(stats.totalHabits);
    completedCountEl.textContent = String(stats.completed);
    monthProgressEl.style.width = `${stats.percent}%`;
    progressLabelEl.textContent = `${stats.percent}%`;
  }

  function buildMonthDays(y, m) {
    const days = daysInMonth(y, m);
    const startW = startWeekday(y, m);
    const out = [];
    let offset = startW;
    let week = 1;
    for (let d = 1; d <= days; d++) {
      out.push({ d, w: week, wd: new Date(y, m, d).getDay(), key: dateKey(new Date(y, m, d)) });
      offset++;
      if (offset === 7) { offset = 0; week++; }
    }
    return out;
  }

  function getWeekDays(days, weekNum) {
    return days.filter(d => d.w === weekNum);
  }

  function getCurrentWeekForToday(days) {
    const todayKey = dateKey(today);
    const todayDay = days.find(d => d.key === todayKey);
    return todayDay ? todayDay.w : 1;
  }

  function createWeekNav() {
    if (!isMobile()) return;
    
    const wrapper = gridRowsEl.parentElement;
    if (!wrapper) return;
    
    // Remove existing week nav if any
    const existing = wrapper.querySelector('.week-nav');
    if (existing) existing.remove();
    
    weekNavContainer = document.createElement('div');
    weekNavContainer.className = 'week-nav';
    
    weekPrevBtn = document.createElement('button');
    weekPrevBtn.type = 'button';
    weekPrevBtn.textContent = '←';
    weekPrevBtn.setAttribute('aria-label', 'Previous week');
    
    weekLabelEl = document.createElement('span');
    weekLabelEl.className = 'week-label';
    
    weekNextBtn = document.createElement('button');
    weekNextBtn.type = 'button';
    weekNextBtn.textContent = '→';
    weekNextBtn.setAttribute('aria-label', 'Next week');
    
    weekNavContainer.appendChild(weekPrevBtn);
    weekNavContainer.appendChild(weekLabelEl);
    weekNavContainer.appendChild(weekNextBtn);
    
    wrapper.insertBefore(weekNavContainer, gridHeaderDaysEl);
    
    weekPrevBtn.addEventListener('click', () => {
      const days = buildMonthDays(viewYear, viewMonth);
      const maxWeek = Math.max(...days.map(d => d.w));
      currentWeek = Math.max(1, currentWeek - 1);
      renderGrid();
    });
    
    weekNextBtn.addEventListener('click', () => {
      const days = buildMonthDays(viewYear, viewMonth);
      const maxWeek = Math.max(...days.map(d => d.w));
      currentWeek = Math.min(maxWeek, currentWeek + 1);
      renderGrid();
    });
  }

  function renderGrid() {
    const y = viewYear, m = viewMonth;
    const days = buildMonthDays(y, m);
    const mobile = isMobile();
    
    // Update current week if needed (e.g., when month changes)
    if (mobile) {
      const todayWeek = getCurrentWeekForToday(days);
      if (viewYear === today.getFullYear() && viewMonth === today.getMonth()) {
        currentWeek = todayWeek;
      }
      createWeekNav();
    }
    
    gridHeaderDaysEl.innerHTML = "";
    gridWeeksEl.innerHTML = "";
    gridRowsEl.innerHTML = "";
    
    if (mobile) {
      // Mobile: Show week strip (7 days)
      const weekDays = getWeekDays(days, currentWeek);
      const maxWeek = Math.max(...days.map(d => d.w));
      
      // Update week label
      if (weekLabelEl) {
        const startDay = weekDays[0];
        const endDay = weekDays[weekDays.length - 1];
        weekLabelEl.textContent = `Week ${currentWeek} of ${maxWeek} • ${startDay.d}-${endDay.d}`;
      }
      
      // Enable/disable week nav buttons
      if (weekPrevBtn) weekPrevBtn.disabled = currentWeek <= 1;
      if (weekNextBtn) weekNextBtn.disabled = currentWeek >= maxWeek;
      
      // Render day headers (7 days)
      for (const day of weekDays) {
        const div = document.createElement("div");
        div.className = "grid-day";
        div.textContent = `${weekdayShort[day.wd]} ${day.d}`;
        const isTodayHeader = day.key === dateKey(today);
        if (isTodayHeader) div.classList.add("today");
        div.addEventListener("click", () => {
          const allDays = buildMonthDays(viewYear, viewMonth);
          const idx = allDays.findIndex(d => d.key === day.key);
          if (idx >= 0) openDayPanel(idx);
        });
        gridHeaderDaysEl.appendChild(div);
      }
      
      // Render habit rows with week days
      for (const h of state.habits) {
        const row = document.createElement("div");
        row.className = "row";
        
        const label = document.createElement("div");
        label.className = "label";
        
        const name = document.createElement("span");
        name.className = "habit-name";
        name.textContent = `${h.icon || ""} ${h.name}`;
        
        const actions = document.createElement("div");
        actions.className = "habit-actions";
        
        const menuBtn = document.createElement("button");
        menuBtn.className = "menu-btn";
        menuBtn.type = "button";
        menuBtn.textContent = "⋯";
        menuBtn.setAttribute("aria-label", `Menu for ${h.name}`);
        menuBtn.setAttribute("aria-haspopup", "true");
        
        // Create menu dropdown with proper positioning
        let menuOpen = false;
        let currentMenu = null;
        
        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          
          // Close any existing menu first
          const existingMenu = document.querySelector('.habit-menu');
          if (existingMenu) {
            existingMenu.remove();
            menuOpen = false;
            currentMenu = null;
            return;
          }
          
          // Open new menu
          const menu = document.createElement("div");
          menu.className = "habit-menu";
          currentMenu = menu;
          
          const editBtn = document.createElement("button");
          editBtn.textContent = "Edit";
          editBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.remove();
            menuOpen = false;
            currentMenu = null;
            openModal(h);
          });
          
          const delBtn = document.createElement("button");
          delBtn.textContent = "Delete";
          delBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            menu.remove();
            menuOpen = false;
            currentMenu = null;
            pendingDeleteId = h.id;
            confirmPanelEl.classList.add("open");
          });
          
          menu.appendChild(editBtn);
          menu.appendChild(delBtn);
          
          // Position menu relative to actions container
          actions.appendChild(menu);
          menuOpen = true;
          
          // Position menu to avoid overflow after it's rendered
          requestAnimationFrame(() => {
            const rect = menuBtn.getBoundingClientRect();
            const menuRect = menu.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Adjust if menu would overflow right
            if (rect.right + menuRect.width > viewportWidth) {
              menu.style.right = "0";
              menu.style.left = "auto";
            }
            
            // Adjust if menu would overflow bottom
            if (rect.bottom + menuRect.height > viewportHeight) {
              menu.style.top = "auto";
              menu.style.bottom = "100%";
              menu.style.marginTop = "0";
              menu.style.marginBottom = "8px";
            }
          });
          
          // Close on outside click
          setTimeout(() => {
            const closeMenu = (e) => {
              if (menu && !menu.contains(e.target) && e.target !== menuBtn && !menuBtn.contains(e.target)) {
                menu.remove();
                menuOpen = false;
                currentMenu = null;
                document.removeEventListener("click", closeMenu);
                document.removeEventListener("touchstart", closeMenu);
              }
            };
            document.addEventListener("click", closeMenu);
            document.addEventListener("touchstart", closeMenu);
          }, 10);
        });
        
        actions.appendChild(menuBtn);
        label.appendChild(name);
        label.appendChild(actions);
        row.appendChild(label);
        
        const cells = document.createElement("div");
        cells.className = "cells";
        
        for (const day of weekDays) {
          const btn = document.createElement("button");
          const isTodayCell = day.key === dateKey(today);
          btn.className = "check" + (getCompletionFor(day.key, h.id) ? " done" : "") + (isTodayCell ? " today" : "");
          btn.setAttribute("aria-label", `Toggle ${h.name} for ${weekdayShort[day.wd]} ${day.d}`);
          btn.addEventListener("click", () => {
            const curr = getCompletionFor(day.key, h.id);
            setCompletionFor(day.key, h.id, !curr);
            renderStats();
            renderAnalysis();
            btn.className = "check" + (!curr ? " done" : "") + (isTodayCell ? " today" : "");
          });
          cells.appendChild(btn);
        }
        
        row.appendChild(cells);
        gridRowsEl.appendChild(row);
      }
    } else {
      // Desktop: Show full month grid
      gridHeaderDaysEl.style.display = "grid";
      gridHeaderDaysEl.style.gridTemplateColumns = `repeat(${days.length}, minmax(44px, 1fr))`;
      gridWeeksEl.style.display = "grid";
      gridWeeksEl.style.gridTemplateColumns = `repeat(${days.length}, minmax(44px, 1fr))`;
      
      // Week labels
      let i = 0;
      while (i < days.length) {
        const startWeek = days[i].w;
        let span = 0;
        const start = i;
        while (i < days.length && days[i].w === startWeek) { span++; i++; }
        const seg = document.createElement("div");
        seg.textContent = `Week ${startWeek}`;
        seg.style.gridColumn = `${start + 1} / ${start + 1 + span}`;
        seg.className = "grid-day";
        gridWeeksEl.appendChild(seg);
      }
      
      // Day headers
      for (const day of days) {
        const div = document.createElement("div");
        div.className = "grid-day";
        div.textContent = `${weekdayShort[day.wd]} ${day.d}`;
        const isTodayHeader = day.key === dateKey(today);
        if (isTodayHeader) div.classList.add("today");
        if (day.wd === 0) div.classList.add("snap");
        div.addEventListener("click", () => {
          openDayPanel(days.indexOf(day));
        });
        gridHeaderDaysEl.appendChild(div);
      }
      
      // Set CSS variable for grid columns
      document.documentElement.style.setProperty('--days-count', days.length);
      
      // Habit rows
      for (const h of state.habits) {
        const row = document.createElement("div");
        row.className = "row";
        
        const label = document.createElement("div");
        label.className = "label";
        
        const name = document.createElement("span");
        name.className = "habit-name";
        name.textContent = `${h.icon || ""} ${h.name}`;
        
        const actions = document.createElement("div");
        actions.className = "habit-actions";
        
        const edit = document.createElement("button");
        edit.className = "pill-btn";
        edit.textContent = "Edit";
        edit.addEventListener("click", () => openModal(h));
        
        const del = document.createElement("button");
        del.className = "pill-btn";
        del.textContent = "Delete";
        del.addEventListener("click", () => {
          pendingDeleteId = h.id;
          confirmPanelEl.classList.add("open");
        });
        
        actions.appendChild(edit);
        actions.appendChild(del);
        label.appendChild(name);
        label.appendChild(actions);
        row.appendChild(label);
        
        for (const day of days) {
          const btn = document.createElement("button");
          const isTodayCell = day.key === dateKey(today);
          btn.className = "check" + (getCompletionFor(day.key, h.id) ? " done" : "") + (isTodayCell ? " today" : "");
          if (day.wd === 0) btn.classList.add("snap");
          btn.setAttribute("aria-label", `Toggle ${h.name} for ${weekdayShort[day.wd]} ${day.d}`);
          btn.addEventListener("click", () => {
            const curr = getCompletionFor(day.key, h.id);
            setCompletionFor(day.key, h.id, !curr);
            renderStats();
            renderAnalysis();
            btn.className = "check" + (!curr ? " done" : "") + (isTodayCell ? " today" : "");
          });
          row.appendChild(btn);
        }
        
        gridRowsEl.appendChild(row);
      }
      
      // Scroll sync for headers
      const syncScroll = () => {
        gridHeaderDaysEl.scrollLeft = gridRowsEl.scrollLeft;
        gridWeeksEl.scrollLeft = gridRowsEl.scrollLeft;
      };
      gridRowsEl.removeEventListener("scroll", syncScroll);
      gridRowsEl.addEventListener("scroll", syncScroll);
    }
  }

  function openDayPanel(index) {
    const y = viewYear, m = viewMonth;
    const days = buildMonthDays(y, m);
    selectedDayIndex = Math.max(0, Math.min(index, days.length - 1));
    dayPanelEl.classList.add("open");
    renderDayPanel();
  }

  function closeDayPanel() {
    dayPanelEl.classList.remove("open");
  }

  function renderDayPanel() {
    const y = viewYear, m = viewMonth;
    const days = buildMonthDays(y, m);
    if (selectedDayIndex == null) return;
    const d = days[selectedDayIndex];
    dayLabelEl.textContent = `${formatMonthTitle(y, m)} • ${weekdayShort[d.wd]} ${d.d}`;
    dayHabitListEl.innerHTML = "";
    for (const h of state.habits) {
      const li = document.createElement("li");
      li.className = "day-item";
      const left = document.createElement("div");
      left.className = "day-name";
      left.textContent = `${h.icon || ""} ${h.name}`;
      const btn = document.createElement("button");
      const done = getCompletionFor(d.key, h.id);
      btn.className = "day-toggle" + (done ? " done" : "");
      btn.textContent = done ? "Done today" : "Mark done";
      btn.setAttribute("aria-label", `${done ? "Unmark" : "Mark"} ${h.name} as done`);
      btn.addEventListener("click", () => {
        setCompletionFor(d.key, h.id, !getCompletionFor(d.key, h.id));
        renderStats();
        renderDayPanel();
        renderAnalysis();
      });
      li.appendChild(left);
      li.appendChild(btn);
      dayHabitListEl.appendChild(li);
    }
  }

  function renderAnalysis() {
    analysisPanelEl.innerHTML = "";
    const y = viewYear, m = viewMonth;
    const days = daysInMonth(y, m);
    for (const h of state.habits) {
      let count = 0;
      for (let d = 1; d <= days; d++) {
        const key = dateKey(new Date(y, m, d));
        if (getCompletionFor(key, h.id)) count++;
      }
      const wrap = document.createElement("div");
      wrap.className = "analysis-item";
      const left = document.createElement("span");
      left.textContent = `${h.icon || ""} ${h.name}`;
      const right = document.createElement("div");
      const percent = days ? Math.round((count / days) * 100) : 0;
      const bar = document.createElement("div");
      bar.className = "bar";
      const fill = document.createElement("span");
      fill.style.width = `${percent}%`;
      bar.appendChild(fill);
      right.appendChild(bar);
      wrap.appendChild(left);
      wrap.appendChild(right);
      analysisPanelEl.appendChild(wrap);
    }
    
    // Responsive chart rendering
    const ctx = mentalChartEl.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    const container = mentalChartEl.parentElement;
    const containerWidth = container ? container.clientWidth - 48 : 300;
    const displayWidth = Math.max(300, containerWidth);
    const aspectRatio = 16 / 9;
    const displayHeight = Math.round(displayWidth / aspectRatio);
    
    mentalChartEl.style.width = `${displayWidth}px`;
    mentalChartEl.style.height = `${displayHeight}px`;
    mentalChartEl.width = displayWidth * dpr;
    mentalChartEl.height = displayHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, displayWidth, displayHeight);
    
    const daysArr = buildMonthDays(y, m);
    const points = daysArr.map(d => {
      let c = 0;
      for (const h of state.habits) if (getCompletionFor(d.key, h.id)) c++;
      const pct = state.habits.length ? c / state.habits.length : 0;
      return pct;
    });
    
    const w = displayWidth;
    const h = displayHeight;
    const step = w / Math.max(1, points.length - 1);
    
    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h - 0.5);
    ctx.lineTo(w, h - 0.5);
    ctx.moveTo(0, 0.5);
    ctx.lineTo(0, h - 0.5);
    ctx.stroke();
    
    // Line
    ctx.strokeStyle = "#2ad66f";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const x = i * step;
      const yv = h - points[i] * h;
      if (i === 0) ctx.moveTo(x, yv);
      else ctx.lineTo(x, yv);
    }
    ctx.stroke();
  }

  function renderAll() {
    renderHeader();
    renderStats();
    renderGrid();
    renderAnalysis();
  }

  function openModal(editHabit = null) {
    habitModal.classList.add("open");
    if (!editHabit) {
      modalTitleEl.textContent = "New Habit";
      habitIdEl.value = "";
      habitNameEl.value = "";
      habitIconEl.value = "";
      habitGoalEl.value = "30";
      deleteBtn.style.display = "none";
    } else {
      modalTitleEl.textContent = "Edit Habit";
      habitIdEl.value = editHabit.id;
      habitNameEl.value = editHabit.name;
      habitIconEl.value = editHabit.icon || "";
      habitGoalEl.value = String(editHabit.goalDays ?? 30);
      deleteBtn.style.display = "inline-block";
    }
    setTimeout(() => habitNameEl.focus(), 50);
  }

  function closeModal() {
    habitModal.classList.remove("open");
  }

  habitModal.addEventListener("click", (e) => { if (e.target === habitModal) closeModal(); });
  cancelBtn.addEventListener("click", closeModal);

  habitForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const id = habitIdEl.value.trim();
    const name = habitNameEl.value.trim();
    const icon = habitIconEl.value.trim();
    const goalDays = Number(habitGoalEl.value) || 30;
    if (!name) return;
    if (!id) {
      const h = { id: uid(), name, icon, goalDays };
      state.habits.push(h);
    } else {
      state.habits = state.habits.map(h => h.id === id ? { ...h, name, icon, goalDays } : h);
    }
    saveState();
    closeModal();
    renderAll();
  });

  deleteBtn.addEventListener("click", () => {
    const id = habitIdEl.value.trim();
    if (!id) return;
    state.habits = state.habits.filter(h => h.id !== id);
    saveState();
    closeModal();
    renderAll();
  });

  addHabitBtn.addEventListener("click", () => openModal());
  addHabitInlineBtn.addEventListener("click", () => {
    const name = (newHabitInputEl.value || "").trim();
    if (!name) return;
    const h = { id: uid(), name, icon: "", goalDays: 30 };
    state.habits.push(h);
    saveState();
    newHabitInputEl.value = "";
    renderAll();
  });
  function calcDetailedStats(y, m) {
    const totalDays = daysInMonth(y, m);
    const habits = state.habits;
    if (habits.length === 0) {
      return {
        completionRate: 0,
        totalCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        bestDay: 0,
        habitsTracked: 0
      };
    }
    
    let totalCompleted = 0;
    let possible = habits.length * totalDays;
    const dayCompletions = [];
    
    // Calculate daily completions
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(y, m, day);
      const key = dateKey(d);
      let dayCount = 0;
      for (const h of habits) {
        if (getCompletionFor(key, h.id)) {
          totalCompleted++;
          dayCount++;
        }
      }
      dayCompletions.push({ day, count: dayCount, percent: habits.length ? Math.round((dayCount / habits.length) * 100) : 0 });
    }
    
    const completionRate = possible === 0 ? 0 : Math.round((totalCompleted / possible) * 100);
    
    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    const todayKey = dateKey(today);
    
    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(y, m, day);
      const key = dateKey(d);
      let allDone = true;
      for (const h of habits) {
        if (!getCompletionFor(key, h.id)) {
          allDone = false;
          break;
        }
      }
      
      if (allDone && habits.length > 0) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
        if (key === todayKey || (d < today && day === totalDays)) {
          currentStreak = tempStreak;
        }
      } else {
        tempStreak = 0;
        if (key === todayKey) currentStreak = 0;
      }
    }
    
    // Best day (highest completion percentage)
    const bestDay = dayCompletions.length > 0 
      ? Math.max(...dayCompletions.map(d => d.percent))
      : 0;
    
    return {
      completionRate,
      totalCompleted,
      currentStreak,
      longestStreak,
      bestDay,
      habitsTracked: habits.length
    };
  }
  
  function calcYearOverview(year) {
    const months = [];
    for (let m = 0; m < 12; m++) {
      const stats = calcMonthStats(year, m);
      months.push({ month: m, percent: stats.percent });
    }
    return months;
  }
  
  function renderDetailedStats() {
    const y = viewYear, m = viewMonth;
    const stats = calcDetailedStats(y, m);
    const yearOverview = calcYearOverview(y);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    statsContentEl.innerHTML = "";
    
    // Stats cards grid
    const cardsGrid = document.createElement("div");
    cardsGrid.className = "stats-cards-grid";
    cardsGrid.style.cssText = "display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-2); margin-bottom: var(--space-4);";
    
    const createStatCard = (label, value, suffix = "") => {
      const card = document.createElement("div");
      card.className = "stat-card";
      card.style.cssText = "background: rgba(255,255,255,0.04); border: 1px solid var(--panel-border); border-radius: var(--radius-md); padding: var(--space-3);";
      
      const labelEl = document.createElement("div");
      labelEl.style.cssText = "color: var(--text-dim); font-size: var(--font-size-xs); font-weight: 600; margin-bottom: var(--space-1); text-transform: uppercase; letter-spacing: 0.5px;";
      labelEl.textContent = label;
      
      const valueEl = document.createElement("div");
      valueEl.style.cssText = "color: var(--text); font-size: var(--font-size-xl); font-weight: 700;";
      valueEl.textContent = value + suffix;
      
      card.appendChild(labelEl);
      card.appendChild(valueEl);
      return card;
    };
    
    cardsGrid.appendChild(createStatCard("Completion Rate", stats.completionRate, "%"));
    cardsGrid.appendChild(createStatCard("Total Completed", stats.totalCompleted));
    cardsGrid.appendChild(createStatCard("Current Streak", stats.currentStreak, " days"));
    cardsGrid.appendChild(createStatCard("Longest Streak", stats.longestStreak, " days"));
    cardsGrid.appendChild(createStatCard("Best Day", stats.bestDay, "%"));
    cardsGrid.appendChild(createStatCard("Habits Tracked", stats.habitsTracked));
    
    statsContentEl.appendChild(cardsGrid);
    
    // Year overview
    const yearSection = document.createElement("div");
    yearSection.className = "year-overview";
    
    const yearTitle = document.createElement("h3");
    yearTitle.style.cssText = "color: var(--text); font-size: var(--font-size-lg); font-weight: 700; margin: 0 0 var(--space-3) 0;";
    yearTitle.textContent = `${y} Overview`;
    yearSection.appendChild(yearTitle);
    
    const monthsGrid = document.createElement("div");
    monthsGrid.className = "months-grid";
    monthsGrid.style.cssText = "display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--space-2);";
    
    if (window.innerWidth < 640) {
      monthsGrid.style.gridTemplateColumns = "repeat(3, 1fr)";
    }
    
    yearOverview.forEach((mo, idx) => {
      const monthBtn = document.createElement("button");
      monthBtn.className = "month-btn";
      const isCurrent = idx === m;
      monthBtn.style.cssText = `
        background: ${isCurrent ? "rgba(42, 214, 111, 0.15)" : "rgba(255,255,255,0.04)"};
        border: 1px solid ${isCurrent ? "#2ad66f" : "var(--panel-border)"};
        border-radius: var(--radius-sm);
        padding: var(--space-2);
        color: ${isCurrent ? "#2ad66f" : "var(--text)"};
        font-size: var(--font-size-xs);
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        min-height: var(--touch-target);
        align-items: center;
        justify-content: center;
      `;
      
      const monthName = document.createElement("div");
      monthName.style.cssText = "font-weight: 600;";
      monthName.textContent = monthNames[idx];
      
      const monthPercent = document.createElement("div");
      monthPercent.style.cssText = "font-weight: 700; font-size: var(--font-size-sm);";
      monthPercent.textContent = mo.percent + "%";
      
      monthBtn.appendChild(monthName);
      monthBtn.appendChild(monthPercent);
      
      monthBtn.addEventListener("click", () => {
        viewYear = y;
        viewMonth = idx;
        renderAll();
        renderDetailedStats();
      });
      
      monthsGrid.appendChild(monthBtn);
    });
    
    yearSection.appendChild(monthsGrid);
    statsContentEl.appendChild(yearSection);
    
    // Close button
    const closeBtnContainer = document.createElement("div");
    closeBtnContainer.style.cssText = "display: flex; justify-content: flex-end; margin-top: var(--space-4);";
    
    const closeBtn = document.createElement("button");
    closeBtn.className = "primary";
    closeBtn.style.cssText = "border: none; border-radius: var(--radius-sm); padding: var(--space-2) var(--space-4); background: var(--accent); color: #07111c; font-weight: 700; font-size: var(--font-size-base); cursor: pointer; min-height: var(--touch-target);";
    closeBtn.textContent = "Close";
    closeBtn.addEventListener("click", () => {
      statsPanelEl.classList.remove("open");
    });
    
    closeBtnContainer.appendChild(closeBtn);
    statsContentEl.appendChild(closeBtnContainer);
  }
  
  toggleStatsBtn.addEventListener("click", () => {
    statsPanelEl.classList.add("open");
    renderDetailedStats();
  });
  statsCloseBtn.addEventListener("click", () => { statsPanelEl.classList.remove("open"); });
  statsPanelEl.addEventListener("click", (e) => {
    if (e.target === statsPanelEl) {
      statsPanelEl.classList.remove("open");
    }
  });
  window.addEventListener("resize", () => {
    if (!dashPanelsEl.hidden) renderAnalysis();
    renderGrid(); // Re-render grid on resize to switch mobile/desktop
  });
  copyPrevBtn.addEventListener("click", () => {
    const prevY = viewMonth === 0 ? viewYear - 1 : viewYear;
    const prevM = viewMonth === 0 ? 11 : viewMonth - 1;
    const prevDays = daysInMonth(prevY, prevM);
    const currDays = daysInMonth(viewYear, viewMonth);
    for (let d = 1; d <= Math.min(prevDays, currDays); d++) {
      const prevKey = dateKey(new Date(prevY, prevM, d));
      const currKey = dateKey(new Date(viewYear, viewMonth, d));
      for (const h of state.habits) {
        const done = getCompletionFor(prevKey, h.id);
        if (done) setCompletionFor(currKey, h.id, true);
      }
    }
    renderAll();
  });

  prevMonthBtn.addEventListener("click", () => {
    if (viewMonth === 0) { viewMonth = 11; viewYear--; } else { viewMonth--; }
    renderAll();
  });
  nextMonthBtn.addEventListener("click", () => {
    if (viewMonth === 11) { viewMonth = 0; viewYear++; } else { viewMonth++; }
    renderAll();
  });
  jumpTodayBtn.addEventListener("click", () => {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    renderAll();
    const days = buildMonthDays(viewYear, viewMonth);
    const todayKey = dateKey(today);
    const idx = Math.max(0, days.findIndex(x => x.key === todayKey));
    openDayPanel(idx);
  });

  dayPrevBtn.addEventListener("click", () => {
    if (selectedDayIndex == null) return;
    selectedDayIndex = Math.max(0, selectedDayIndex - 1);
    renderDayPanel();
  });
  dayNextBtn.addEventListener("click", () => {
    const days = buildMonthDays(viewYear, viewMonth);
    if (selectedDayIndex == null) return;
    selectedDayIndex = Math.min(days.length - 1, selectedDayIndex + 1);
    renderDayPanel();
  });
  dayCloseBtn.addEventListener("click", closeDayPanel);

  confirmCloseBtn.addEventListener("click", () => {
    confirmPanelEl.classList.remove("open");
    pendingDeleteId = null;
  });
  confirmCancelBtn.addEventListener("click", () => {
    confirmPanelEl.classList.remove("open");
    pendingDeleteId = null;
  });
  confirmDeleteBtn.addEventListener("click", () => {
    if (!pendingDeleteId) return;
    state.habits = state.habits.filter(x => x.id !== pendingDeleteId);
    saveState();
    pendingDeleteId = null;
    confirmPanelEl.classList.remove("open");
    renderAll();
  });

  renderAll();
  
  // Check if we should open stats from URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('stats') === 'true') {
    setTimeout(() => {
      statsPanelEl.classList.add("open");
      renderDetailedStats();
    }, 100);
  }
})();
