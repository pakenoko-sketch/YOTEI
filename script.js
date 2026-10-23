
"use strict";

const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "myCalendarEvents_complete_v2";
const today = new Date();

let selectedDate = dateKey(today);
let shownDate = new Date(today.getFullYear(), today.getMonth(), 1);
let currentView = "month";
let events = [];
let places = [];
let lastTravel = null;

try {
  events = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (!Array.isArray(events)) events = [];
} catch {
  events = [];
}

try {
  places = JSON.parse(localStorage.getItem("myCalendarPlaces_v1") || "[]");
  if (!Array.isArray(places)) places = [];
} catch {
  places = [];
}

/* 日付と保存 */

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseDate(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function saveEvents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

function savePlaces() {
  localStorage.setItem("myCalendarPlaces_v1", JSON.stringify(places));
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function formatDate(dateString) {
  const d = parseDate(dateString);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}

function formatTime(event) {
  if (event.allDay) return "終日";
  return `${event.startTime || "09:00"}〜${event.endTime || "10:00"}`;
}

function formatMode(mode) {
  if (mode === "driving") return "車";
  if (mode === "walking") return "徒歩";
  return "電車・バス";
}

function findPlace(id) {
  return places.find((p) => p.id === id);
}

function placeLabel(id) {
  const place = findPlace(id);
  return place ? place.name : "未設定";
}

/* 繰り返し予定を日付ごとに表示 */

function occursOn(event, dateString) {
  if (dateString < event.startDate) return false;
  if (event.endDate && dateString > event.endDate) return false;

  if (!event.repeat || event.repeat === "none") {
    return dateString === event.startDate;
  }

  const start = parseDate(event.startDate);
  const current = parseDate(dateString);

  if (current < start) return false;

  if (event.repeat === "daily") return true;

  if (event.repeat === "weekly") {
    const diff = Math.round((current - start) / 86400000);
    return diff % 7 === 0;
  }

  if (event.repeat === "monthly") {
    return current.getDate() === start.getDate();
  }

  if (event.repeat === "yearly") {
    return current.getMonth() === start.getMonth()
      && current.getDate() === start.getDate();
  }

  return false;
}

function eventsForDate(dateString) {
  return events
    .filter((event) => occursOn(event, dateString))
    .sort((a, b) => {
      if (a.allDay && !b.allDay) return -1;
      if (!a.allDay && b.allDay) return 1;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });
}

/* カレンダー表示 */

function renderCalendar() {
  $("monthTitle").textContent =
    `${shownDate.getFullYear()}年${shownDate.getMonth() + 1}月`;

  const grid = $("calendarGrid");
  grid.replaceChildren();

  const year = shownDate.getFullYear();
  const month = shownDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const start = new Date(year, month, 1 - firstDay.getDay());

  let daysToShow = 42;
  if (currentView === "week") {
    const d = parseDate(selectedDate);
    start.setFullYear(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay());
    daysToShow = 7;
  } else if (currentView === "day") {
    start.setTime(parseDate(selectedDate).getTime());
    daysToShow = 1;
  }

  for (let i = 0; i < daysToShow; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = dateKey(d);
    const dayEvents = eventsForDate(key);

    if (currentView === "list") break;

    const button = document.createElement("button");
    button.className = "calendar-day";
    if (key === selectedDate) button.classList.add("selected");
    if (key === dateKey(today)) button.classList.add("today");
    if (d.getMonth() !== month && currentView === "month") {
      button.classList.add("outside");
    }

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = d.getDate();
    button.append(number);

    if (dayEvents.length) {
      const dots = document.createElement("div");
      dots.className = "event-dots";

      dayEvents.slice(0, 3).forEach((event) => {
        const dot = document.createElement("span");
        dot.className = "event-dot";
        dot.style.background = event.color || "#4388ed";
        dots.append(dot);
      });

      button.append(dots);
    }

    button.addEventListener("click", () => {
      selectedDate = key;
      if (currentView === "week" || currentView === "day") {
        shownDate = new Date(d.getFullYear(), d.getMonth(), 1);
      }
      renderAll();
    });

    grid.append(button);
  }

  if (currentView === "list") {
    grid.hidden = true;
  } else {
    grid.hidden = false;
  }

  $("selectedDateTitle").textContent = formatDate(selectedDate);
  renderEvents();
}

function renderEvents() {
  const list = $("eventList");
  list.replaceChildren();

  const days = [];

  if (currentView === "list") {
    const start = new Date(selectedDate);
    for (let i = 0; i < 30; i++) {
      const d = parseDate(selectedDate);
      d.setDate(d.getDate() + i);
      days.push(dateKey(d));
    }
  } else {
    days.push(selectedDate);
  }

  let count = 0;

  days.forEach((day) => {
    const dayEvents = eventsForDate(day);

    if (currentView === "list" && dayEvents.length) {
      const heading = document.createElement("h3");
      heading.textContent = formatDate(day);
      list.append(heading);
    }

    dayEvents.forEach((event) => {
      count++;

      const item = document.createElement("div");
      item.className = "event-item";

      const stripe = document.createElement("div");
      stripe.className = "event-stripe";
      stripe.style.background = event.color || "#4388ed";

      const content = document.createElement("div");
      content.className = "event-content";

      const title = document.createElement("strong");
      title.textContent = event.title || "名称なし";
      content.append(title);

      const meta = document.createElement("div");
      meta.className = "event-meta";

      const lines = [formatTime(event)];

      if (event.location) lines.push("⌖ " + event.location);

      if (event.travel && Number.isFinite(Number(event.travel.minutes))) {
        lines.push(
          `↗ ${placeLabel(event.travel.originId)} → ` +
          `${placeLabel(event.travel.destinationId)}・` +
          `${event.travel.minutes}分（${formatMode(event.travel.mode)}）`
        );

        if (!event.allDay && event.startTime) {
          const departure = calculateDeparture(
            day, event.startTime, Number(event.travel.minutes)
          );
          if (departure) lines.push("出発目安：" + departure);
        }
      }

      if (event.notes) lines.push(event.notes);

      meta.textContent = lines.join("　·　");
      content.append(meta);

      const edit = document.createElement("button");
      edit.className = "event-edit";
      edit.textContent = "編集";
      edit.addEventListener("click", () => openEventDialog(event));

      item.append(stripe, content, edit);
      list.append(item);
    });
  });

  if (!count) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = currentView === "list"
      ? "この日から30日間に予定はありません。"
      : "この日の予定はありません。＋予定を追加から登録できます。";
    list.append(empty);
  }
}

function renderAll() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle(
      "active", button.dataset.view === currentView
    );
  });

  renderCalendar();
}

/* 移動時間の計算補助 */

function calculateDeparture(date, time, minutes) {
  if (!date || !time || !Number.isFinite(minutes)) return "";

  const start = new Date(`${date}T${time}:00`);
  if (Number.isNaN(start.getTime())) return "";

  start.setMinutes(start.getMinutes() - minutes);

  return `${start.getHours().toString().padStart(2, "0")}:` +
    `${start.getMinutes().toString().padStart(2, "0")}`;
}

function openMaps(originId, destinationId, mode) {
  const origin = findPlace(originId);
  const destination = findPlace(destinationId);

  if (!origin || !destination) {
    alert("出発地と目的地を場所リストから選んでください。");
    return;
  }

  const params = new URLSearchParams({
    api: "1",
    origin: origin.address,
    destination: destination.address,
    travelmode: mode || "driving"
  });

  const url = "https://www.google.com/maps/dir/?" + params.toString();
  window.open(url, "_blank", "noopener");
}

/* 選択肢を場所リストから作る */

function fillPlaceSelect(select, selectedId = "") {
  select.replaceChildren();

  const blank = document.createElement("option");
  blank.value = "";
  blank.textContent = "場所を選択";
  select.append(blank);

  places.forEach((place) => {
    const option = document.createElement("option");
    option.value = place.id;
    option.textContent = place.name;
    select.append(option);
  });

  select.value = selectedId;
}

function refreshPlaceSelects() {
  [
    "eventPlace", "eventOrigin", "eventDestination",
    "travelOrigin", "travelDestination"
  ].forEach((id) => fillPlaceSelect($(id)));

  renderPlaces();
}

/* 予定の追加・編集 */

function openEventDialog(event = null) {
  $("eventForm").reset();
  refreshPlaceSelects();

  $("eventDialogTitle").textContent = event ? "予定を編集" : "予定を追加";
  $("eventId").value = event?.id || "";
  $("eventTitle").value = event?.title || "";
  $("eventAllDay").checked = event?.allDay || false;
  $("eventStartDate").value = event?.startDate || selectedDate;
  $("eventEndDate").value = event?.endDate || event?.startDate || selectedDate;
  $("eventStartTime").value = event?.startTime || "09:00";
  $("eventEndTime").value = event?.endTime || "10:00";
  $("eventRepeat").value = event?.repeat || "none";
  $("eventPlace").value = event?.placeId || "";
  $("eventLocation").value = event?.location || "";
  $("eventNotes").value = event?.notes || "";
  $("eventColor").value = event?.color || "#4388ed";

  $("eventOrigin").value = event?.travel?.originId || "";
  $("eventDestination").value = event?.travel?.destinationId || "";
  $("eventTravelMode").value = event?.travel?.mode || "driving";
  $("eventTravelMinutes").value =
    event?.travel?.minutes ?? "";

  $("deleteEventBtn").hidden = !event;
  updateDepartureHint();
  $("eventDialog").showModal();
}

function readEventTravel() {
  const originId = $("eventOrigin").value;
  const destinationId = $("eventDestination").value;
  const mode = $("eventTravelMode").value;
  const rawMinutes = $("eventTravelMinutes").value;

  if (!originId && !destinationId && rawMinutes === "") return null;

  if (!originId || !destinationId) {
    throw new Error("移動時間を保存するには出発地と目的地を選んでください。");
  }

  if (rawMinutes === "" || !Number.isFinite(Number(rawMinutes))
      || Number(rawMinutes) < 0) {
    throw new Error("移動時間を分単位で入力してください。");
  }

  return {
    originId,
    destinationId,
    mode,
    minutes: Number(rawMinutes)
  };
}

$("eventForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = $("eventId").value || makeId();
  let travel;

  try {
    travel = readEventTravel();
  } catch (error) {
    alert(error.message);
    return;
  }

  const startDate = $("eventStartDate").value;
  const endDate = $("eventEndDate").value;

  if (endDate < startDate) {
    alert("終了日は開始日以降にしてください。");
    return;
  }

  const event = {
    id,
    title: $("eventTitle").value.trim(),
    allDay: $("eventAllDay").checked,
    startDate,
    endDate,
    startTime: $("eventStartTime").value,
    endTime: $("eventEndTime").value,
    repeat: $("eventRepeat").value,
    placeId: $("eventPlace").value,
    location: $("eventLocation").value.trim(),
    notes: $("eventNotes").value.trim(),
    color: $("eventColor").value,
    travel
  };

  const index = events.findIndex((item) => item.id === id);
  if (index >= 0) events[index] = event;
  else events.push(event);

  saveEvents();
  selectedDate = startDate;
  shownDate = new Date(
    parseDate(startDate).getFullYear(),
    parseDate(startDate).getMonth(), 1
  );

  $("eventDialog").close();
  renderAll();
});

$("deleteEventBtn").addEventListener("click", () => {
  const id = $("eventId").value;
  if (!id) return;

  if (!confirm("この予定を削除しますか？")) return;

  events = events.filter((event) => event.id !== id);
  saveEvents();
  $("eventDialog").close();
  renderAll();
});

$("eventPlace").addEventListener("change", () => {
  const place = findPlace($("eventPlace").value);
  if (place) $("eventLocation").value = place.address;
});

function updateDepartureHint() {
  const minutes = Number($("eventTravelMinutes").value);
  const date = $("eventStartDate").value;
  const time = $("eventStartTime").value;

  if ($("eventAllDay").checked || !date || !time ||
      $("eventTravelMinutes").value === "" || minutes < 0) {
    $("eventDepartureHint").textContent =
      "移動時間を入力すると、出発の目安を表示します。";
    return;
  }

  const departure = calculateDeparture(date, time, minutes);
  $("eventDepartureHint").textContent =
    departure ? `移動時間 ${minutes}分の場合、出発の目安は ${departure} です。` : "";
}

["eventTravelMinutes", "eventStartDate", "eventStartTime", "eventAllDay"]
  .forEach((id) => $(id).addEventListener("change", updateDepartureHint));

$("eventRouteBtn").addEventListener("click", () => {
  openMaps(
    $("eventOrigin").value,
    $("eventDestination").value,
    $("eventTravelMode").value
  );
});

/* 移動時間の検索と保存 */

$("openTravelBtn").addEventListener("click", openTravelDialog);
$("travelNav").addEventListener("click", openTravelDialog);

function openTravelDialog() {
  refreshPlaceSelects();
  $("travelForm").reset();
  $("travelResult").hidden = true;
  $("travelDialog").showModal();
}

$("travelForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const originId = $("travelOrigin").value;
  const destinationId = $("travelDestination").value;
  const mode = $("travelMode").value;

  openMaps(originId, destinationId, mode);
});

$("travelMinutes").addEventListener("input", () => {
  const minutes = Number($("travelMinutes").value);
  const arrival = $("travelArrival").value;
  const panel = $("travelResult");

  if ($("travelMinutes").value === "" ||
      !Number.isFinite(minutes) || minutes < 0) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  if (arrival) {
    const d = new Date(arrival);
    d.setMinutes(d.getMinutes() - minutes);
    const departure = `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ` +
      `${String(d.getHours()).padStart(2, "0")}:` +
      `${String(d.getMinutes()).padStart(2, "0")}`;
    panel.textContent = `移動時間：約${minutes}分。予定に間に合うための出発目安：${departure}`;
  } else {
    panel.textContent = `移動時間：約${minutes}分です。予定の開始時刻を入力すると、出発目安も計算できます。`;
  }
});

$("saveTravelBtn").addEventListener("click", () => {
  const originId = $("travelOrigin").value;
  const destinationId = $("travelDestination").value;
  const mode = $("travelMode").value;
  const rawMinutes = $("travelMinutes").value;

  if (!originId || !destinationId) {
    alert("出発地と目的地を選んでください。");
    return;
  }

  if (rawMinutes === "" || !Number.isFinite(Number(rawMinutes)) ||
      Number(rawMinutes) < 0) {
    alert("Google Mapsで確認した移動時間を分単位で入力してください。");
    return;
  }

  lastTravel = {
    originId,
    destinationId,
    mode,
    minutes: Number(rawMinutes)
  };

  const arrival = $("travelArrival").value;

  const event = {
    id: makeId(),
    title: `移動：${placeLabel(originId)} → ${placeLabel(destinationId)}`,
    allDay: false,
    startDate: arrival ? arrival.slice(0, 10) : selectedDate,
    endDate: arrival ? arrival.slice(0, 10) : selectedDate,
    startTime: arrival ? arrival.slice(11, 16) : "09:00",
    endTime: arrival ? arrival.slice(11, 16) : "09:00",
    repeat: "none",
    placeId: destinationId,
    location: findPlace(destinationId)?.address || "",
    notes: "移動時間を確認して登録した予定です。",
    color: "#43a88b",
    travel: lastTravel
  };

  events.push(event);
  saveEvents();

  selectedDate = event.startDate;
  const d = parseDate(selectedDate);
  shownDate = new Date(d.getFullYear(), d.getMonth(), 1);

  $("travelDialog").close();
  renderAll();

  alert("移動情報を予定として保存しました。");
});

/* 場所リストの追加・編集・削除 */

$("managePlacesBtn").addEventListener("click", openPlacesDialog);
$("placesNav").addEventListener("click", openPlacesDialog);

function openPlacesDialog() {
  clearPlaceForm();
  renderPlaces();
  $("placesDialog").showModal();
}

function clearPlaceForm() {
  $("placeForm").reset();
  $("placeId").value = "";
}

$("cancelPlaceEditBtn").addEventListener("click", clearPlaceForm);

$("placeForm").addEventListener("submit", (e) => {
  e.preventDefault();

  const id = $("placeId").value || makeId();
  const name = $("placeName").value.trim();
  const address = $("placeAddress").value.trim();

  if (!name || !address) {
    alert("場所の名前と住所を入力してください。");
    return;
  }

  const duplicate = places.find(
    (place) => place.name === name && place.id !== id
  );

  if (duplicate) {
    if (!confirm("同じ名前の場所があります。それでも保存しますか？")) {
      return;
    }
  }

  const place = { id, name, address };
  const index = places.findIndex((item) => item.id === id);

  if (index >= 0) places[index] = place;
  else places.push(place);

  savePlaces();
  clearPlaceForm();
  refreshPlaceSelects();
  renderAll();
});

function renderPlaces() {
  const list = $("placesList");
  if (!list) return;

  list.replaceChildren();

  if (!places.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "まだ場所がありません。上の欄から登録してください。";
    list.append(empty);
    return;
  }

  places.forEach((place) => {
    const item = document.createElement("div");
    item.className = "place-item";

    const info = document.createElement("div");
    info.className = "place-info";

    const name = document.createElement("strong");
    name.textContent = place.name;

    const address = document.createElement("span");
    address.textContent = place.address;

    info.append(name, address);

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "編集";
    edit.addEventListener("click", () => {
      $("placeId").value = place.id;
      $("placeName").value = place.name;
      $("placeAddress").value = place.address;
      $("placeName").focus();
    });

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "削除";
    remove.addEventListener("click", () => {
      if (!confirm(`「${place.name}」を削除しますか？`)) return;

      places = places.filter((p) => p.id !== place.id);
      savePlaces();
      refreshPlaceSelects();
      renderAll();
    });

    item.append(info, edit, remove);
    list.append(item);
  });
}

/* 画面操作 */

$("prevBtn").addEventListener("click", () => {
  if (currentView === "week") {
    const d = parseDate(selectedDate);
    d.setDate(d.getDate() - 7);
    selectedDate = dateKey(d);
  } else if (currentView === "day") {
    const d = parseDate(selectedDate);
    d.setDate(d.getDate() - 1);
    selectedDate = dateKey(d);
  } else {
    shownDate.setMonth(shownDate.getMonth() - 1);
    selectedDate = dateKey(shownDate);
  }
  renderAll();
});

$("nextBtn").addEventListener("click", () => {
  if (currentView === "week") {
    const d = parseDate(selectedDate);
    d.setDate(d.getDate() + 7);
    selectedDate = dateKey(d);
  } else if (currentView === "day") {
    const d = parseDate(selectedDate);
    d.setDate(d.getDate() + 1);
    selectedDate = dateKey(d);
  } else {
    shownDate.setMonth(shownDate.getMonth() + 1);
    selectedDate = dateKey(shownDate);
  }
  renderAll();
});

$("todayBtn").addEventListener("click", () => {
  selectedDate = dateKey(new Date());
  shownDate = new Date(today.getFullYear(), today.getMonth(), 1);
  renderAll();
});

document.querySelectorAll("[data-view]").forEach((button) => {
  button.addEventListener("click", () => {
    currentView = button.dataset.view;
    renderAll();
  });
});

$("addEventBtn").addEventListener("click", () => openEventDialog());

$("calendarNav").addEventListener("click", () => {
  currentView = "month";
  renderAll();
  window.scrollTo({ top: 0, behavior: "smooth" });
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => {
    $(button.dataset.close).close();
  });
});

/* バックアップと復元 */

$("exportBtn").addEventListener("click", () => {
  const data = {
    version: 2,
    events,
    places
  };

  const blob = new Blob(
    [JSON.stringify(data, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "my-calendar-backup.json";
  a.click();
  URL.revokeObjectURL(url);
});

$("importBtn").addEventListener("click", () => $("importFile").click());

$("importFile").addEventListener("change", async () => {
  const file = $("importFile").files[0];
  if (!file) return;

  try {
    const data = JSON.parse(await file.text());

    if (Array.isArray(data)) {
      if (!confirm("現在の予定を、読み込んだ予定で置き換えますか？")) return;
      events = data;
    } else if (data && Array.isArray(data.events)) {
      if (!confirm("現在の予定と場所を、バックアップの内容で置き換えますか？")) return;
      events = data.events;
      places = Array.isArray(data.places) ? data.places : [];
    } else {
      throw new Error("バックアップの形式が正しくありません。");
    }

    saveEvents();
    savePlaces();
    refreshPlaceSelects();
    renderAll();
    alert("バックアップを復元しました。");
  } catch (error) {
    alert("読み込めませんでした：" + error.message);
  } finally {
    $("importFile").value = "";
  }
});

/* 起動 */

$("eventAllDay").addEventListener("change", () => {
  const allDay = $("eventAllDay").checked;
  $("eventStartTime").disabled = allDay;
  $("eventEndTime").disabled = allDay;
});

refreshPlaceSelects();
renderAll();
