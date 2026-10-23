
(function(){
  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'myCalendarEvents_v1';
  const today = new Date();

  const dateKey = d =>
    `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  const parseDate = s => {
    const [y,m,d] = s.split('-').map(Number);
    return new Date(y,m-1,d);
  };

  const jpDate = d =>
    `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日（${'日月火水木金土'[d.getDay()]}）`;

  const monthFmt = d => `${d.getFullYear()}年${d.getMonth()+1}月`;

  const escapeHtml = s =>
    String(s ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;',
      '<':'&lt;',
      '>':'&gt;',
      '"':'&quot;',
      "'":'&#39;'
    }[c]));

  let viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedDate = dateKey(today);
  let editingId = null;
  let selectedColor = '#3478f6';
  let activeTab = 'calendar';
  let events = [];

  try {
    events = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!Array.isArray(events)) events = [];
  } catch(e) {
    events = [];
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    } catch(e) {
      showToast('保存できません。Safariの設定を確認してください');
    }
  }

  function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => t.style.display = 'none', 2200);
  }

  function sortedEvents(day) {
    return events
      .filter(e => e.date === day)
      .sort((a,b) => (a.start || '').localeCompare(b.start || ''));
  }

  function renderCalendar() {
    $('monthTitle').textContent = monthFmt(viewMonth);

    const first = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());

    const days = $('days');
    days.innerHTML = '';

    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);

      const key = dateKey(d);
      const btn = document.createElement('button');

      btn.className = 'day'
        + (d.getMonth() !== viewMonth.getMonth() ? ' other' : '')
        + (key === selectedDate ? ' selected' : '')
        + (key === dateKey(today) ? ' today' : '');

      btn.setAttribute('aria-label', jpDate(d));

      const num = document.createElement('span');
      num.className = 'num';
      num.textContent = d.getDate();
      btn.appendChild(num);

      const dots = document.createElement('span');
      dots.className = 'dots';

      const dayEvents = sortedEvents(key).slice(0,3);

      dayEvents.forEach(e => {
        const dot = document.createElement('i');
        dot.className = 'dot';
        dot.style.background = e.color || '#3478f6';
        dots.appendChild(dot);
      });

      btn.appendChild(dots);

      btn.addEventListener('click', () => {
        selectedDate = key;

        if (d.getMonth() !== viewMonth.getMonth()) {
          viewMonth = new Date(d.getFullYear(), d.getMonth(), 1);
        }

        render();
      });

      days.appendChild(btn);
    }
  }

  function renderEvents() {
    const d = parseDate(selectedDate);

    $('selectedTitle').textContent =
      activeTab === 'list'
        ? '予定一覧'
        : (selectedDate === dateKey(today)
            ? '今日の予定'
            : `${d.getMonth()+1}月${d.getDate()}日の予定`);

    $('selectedSub').textContent = jpDate(d);

    const list = $('eventList');
    list.innerHTML = '';

    let items;

    if (activeTab === 'list') {
      items = events.slice().sort((a,b) =>
        (a.date + a.start).localeCompare(b.date + b.start)
      );
    } else {
      items = sortedEvents(selectedDate);
    }

    if (!items.length) {
      list.innerHTML =
        '<div class="empty"><div class="emoji">☀️</div>' +
        '<div>予定はまだありません</div>' +
        '<div style="margin-top:5px">「＋ 予定を追加」から登録できます</div></div>';
      return;
    }

    items.forEach(e => {
      const card = document.createElement('article');
      card.className = 'event';

      const time = e.start
        ? (e.start + (e.end ? ' – ' + e.end : ''))
        : '時刻未設定';

      card.innerHTML =
        `<div class="eventbar" style="background:${escapeHtml(e.color || '#3478f6')}"></div>` +
        `<div class="eventmain">` +
        `<div class="eventname">${escapeHtml(e.title)}</div>` +
        `<div class="eventtime">${activeTab === 'list' ? escapeHtml(jpDate(parseDate(e.date)) + ' · ') : ''}${escapeHtml(time)}</div>` +
        `${e.location ? `<div class="eventmeta">⌖ ${escapeHtml(e.location)}</div>` : ''}` +
        `${e.notes ? `<div class="eventmeta">${escapeHtml(e.notes)}</div>` : ''}` +
        `</div><div class="eventactions"><button class="tiny" aria-label="編集">編集</button></div>`;

      card.querySelector('button').addEventListener('click', () => openForm(e.id));
      list.appendChild(card);
    });
  }

  function render() {
    renderCalendar();
    renderEvents();

    document.querySelectorAll('.navitem').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === activeTab)
    );
  }

  function openForm(id = null) {
    editingId = id;
    const e = id ? events.find(x => x.id === id) : null;

    $('eventForm').reset();
    $('formTitle').textContent = e ? '予定を編集' : '新しい予定';
    $('titleInput').value = e?.title || '';
    $('dateInput').value = e?.date || selectedDate;
    $('locationInput').value = e?.location || '';
    $('startInput').value = e?.start || '09:00';
    $('endInput').value = e?.end || '10:00';
    $('notesInput').value = e?.notes || '';

    selectedColor = e?.color || '#3478f6';

    document.querySelectorAll('.colorpick').forEach(b =>
      b.classList.toggle('chosen', b.dataset.color === selectedColor)
    );

    $('deleteRow').style.display = e ? 'flex' : 'none';
    $('overlay').classList.add('open');

    setTimeout(() => $('titleInput').focus({preventScroll:true}), 100);
  }

  function closeForm() {
    $('overlay').classList.remove('open');
  }

  function addNew() {
    openForm();
  }

  ['openAddTop','openAdd','fab'].forEach(id =>
    $(id).addEventListener('click', addNew)
  );

  $('closeSheet').addEventListener('click', closeForm);
  $('cancelForm').addEventListener('click', closeForm);

  $('overlay').addEventListener('click', e => {
    if (e.target === $('overlay')) closeForm();
  });

  $('colors').addEventListener('click', e => {
    const b = e.target.closest('[data-color]');
    if (!b) return;

    selectedColor = b.dataset.color;

    document.querySelectorAll('.colorpick').forEach(x =>
      x.classList.toggle('chosen', x === b)
    );
  });

  $('eventForm').addEventListener('submit', e => {
    e.preventDefault();

    const title = $('titleInput').value.trim();

    if (!title) {
      showToast('タイトルを入力してください');
      return;
    }

    const date = $('dateInput').value;

    if (!date) {
      showToast('日付を選んでください');
      return;
    }

    const start = $('startInput').value;
    const end = $('endInput').value;

    if (start && end && end < start) {
      showToast('終了時刻を開始時刻より後にしてください');
      return;
    }

    const item = {
      id: editingId || `${Date.now()}_${Math.random().toString(16).slice(2)}`,
      title,
      date,
      location: $('locationInput').value.trim(),
      start,
      end,
      notes: $('notesInput').value.trim(),
      color: selectedColor
    };

    if (editingId) {
      events = events.map(x => x.id === editingId ? item : x);
    } else {
      events.push(item);
    }

    selectedDate = date;

    viewMonth = new Date(
      parseDate(date).getFullYear(),
      parseDate(date).getMonth(),
      1
    );

    persist();
    closeForm();
    render();
    showToast(editingId ? '予定を更新しました' : '予定を保存しました');
  });

  $('deleteEvent').addEventListener('click', () => {
    if (!editingId) return;

    events = events.filter(x => x.id !== editingId);

    persist();
    closeForm();
    render();
    showToast('予定を削除しました');
  });

  $('prevMonth').addEventListener('click', () => {
    viewMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() - 1,
      1
    );
    renderCalendar();
  });

  $('nextMonth').addEventListener('click', () => {
    viewMonth = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth() + 1,
      1
    );
    renderCalendar();
  });

  $('goToday').addEventListener('click', () => {
    selectedDate = dateKey(today);
    viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    activeTab = 'calendar';
    render();
  });

  document.querySelectorAll('.navitem').forEach(b =>
    b.addEventListener('click', () => {
      const tab = b.dataset.tab;

      if (tab === 'today') {
        selectedDate = dateKey(today);
        viewMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        activeTab = 'calendar';
      } else if (tab === 'settings') {
        showToast('設定機能は次の版で追加できます');
        return;
      } else {
        activeTab = tab;
      }

      render();
    })
  );

  render();
})();
