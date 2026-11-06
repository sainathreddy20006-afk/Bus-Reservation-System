/**
 * Sainath Bus Reservation System
 * Reusable Autocomplete & Compact Custom Date Picker Components
 */

// City list categorized by state for rich visual hints
const CITY_DATABASE = [
  // Andhra Pradesh
  { name: 'Kurnool', state: 'Andhra Pradesh', tag: 'Rayalaseema Hub' },
  { name: 'Nandyal', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Vijayawada', state: 'Andhra Pradesh', tag: 'Commercial Capital' },
  { name: 'Guntur', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', tag: 'Port City' },
  { name: 'Tirupati', state: 'Andhra Pradesh', tag: 'Pilgrim Capital' },
  { name: 'Kadapa', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Anantapur', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Nellore', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Ongole', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Rajahmundry', state: 'Andhra Pradesh', tag: 'Cultural City' },
  { name: 'Kakinada', state: 'Andhra Pradesh', tag: 'Smart Port' },
  { name: 'Eluru', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Srikakulam', state: 'Andhra Pradesh', tag: 'North Coast' },
  { name: 'Chittoor', state: 'Andhra Pradesh', tag: 'Andhra Pradesh' },
  { name: 'Amaravati', state: 'Andhra Pradesh', tag: 'Capital Region' },

  // Connected Major Destinations
  { name: 'Hyderabad', state: 'Telangana', tag: 'Metro Hub' },
  { name: 'Bengaluru', state: 'Karnataka', tag: 'Silicon Valley' },
  { name: 'Chennai', state: 'Tamil Nadu', tag: 'Metro Hub' },
  { name: 'Mumbai', state: 'Maharashtra', tag: 'Financial Capital' },
  { name: 'Pune', state: 'Maharashtra', tag: 'Cultural Hub' },
  { name: 'Goa', state: 'Goa', tag: 'Beach Gateway' },
  { name: 'Shirdi', state: 'Maharashtra', tag: 'Holy Shrine' },
  { name: 'Nashik', state: 'Maharashtra', tag: 'Godavari City' }
];

/**
 * Initialize City Autocomplete on an input element
 */
function setupCityAutocomplete(inputId, clearBtnId, dropdownId, otherInputId) {
  const input = document.getElementById(inputId);
  const clearBtn = document.getElementById(clearBtnId);
  const dropdown = document.getElementById(dropdownId);
  if (!input || !dropdown) return;

  let currentFocus = -1;

  function renderList(query = '') {
    const q = query.trim().toLowerCase();
    let matches = CITY_DATABASE;

    if (q) {
      matches = CITY_DATABASE.filter(c => 
        c.name.toLowerCase().includes(q) || c.state.toLowerCase().includes(q)
      );
    }

    if (matches.length === 0) {
      dropdown.innerHTML = `<div class="autocomplete-empty">No cities found matching "${escapeHtml(query)}"</div>`;
      dropdown.style.display = 'block';
      return;
    }

    dropdown.innerHTML = matches.map((item, idx) => {
      let displayName = escapeHtml(item.name);
      if (q && item.name.toLowerCase().includes(q)) {
        const regex = new RegExp(`(${q})`, 'gi');
        displayName = item.name.replace(regex, '<mark class="city-match">$1</mark>');
      }

      return `
        <div class="autocomplete-item" data-index="${idx}" data-city="${escapeHtml(item.name)}">
          <div>
            <span>📍 ${displayName}</span>
          </div>
          <span class="city-state-badge">${escapeHtml(item.state)}</span>
        </div>
      `;
    }).join('');

    dropdown.style.display = 'block';
    currentFocus = -1;

    // Attach click listeners to items
    dropdown.querySelectorAll('.autocomplete-item').forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectCity(el.dataset.city);
      });
    });
  }

  function selectCity(cityName) {
    input.value = cityName;
    dropdown.style.display = 'none';
    if (clearBtn) clearBtn.style.display = 'flex';

    // Validate identical cities with other input
    if (otherInputId) {
      const otherInput = document.getElementById(otherInputId);
      if (otherInput && otherInput.value.trim().toLowerCase() === cityName.toLowerCase()) {
        showValidationWarning('Origin and destination cannot be the exact same city.');
      } else {
        clearValidationWarning();
      }
    }
  }

  // Input event
  input.addEventListener('input', () => {
    const val = input.value;
    if (clearBtn) clearBtn.style.display = val.length > 0 ? 'flex' : 'none';
    renderList(val);
  });

  // Focus event
  input.addEventListener('focus', () => {
    renderList(input.value);
  });

  // Blur event
  input.addEventListener('blur', () => {
    setTimeout(() => {
      dropdown.style.display = 'none';
    }, 200);
  });

  // Clear button click
  if (clearBtn) {
    clearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      input.value = '';
      clearBtn.style.display = 'none';
      input.focus();
      renderList('');
      clearValidationWarning();
    });
  }

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const items = dropdown.querySelectorAll('.autocomplete-item');
    if (dropdown.style.display !== 'block' || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      currentFocus++;
      if (currentFocus >= items.length) currentFocus = 0;
      setActiveItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      currentFocus--;
      if (currentFocus < 0) currentFocus = items.length - 1;
      setActiveItem(items);
    } else if (e.key === 'Enter') {
      if (currentFocus > -1 && items[currentFocus]) {
        e.preventDefault();
        selectCity(items[currentFocus].dataset.city);
      }
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  function setActiveItem(items) {
    items.forEach(i => i.classList.remove('focused'));
    if (currentFocus > -1 && items[currentFocus]) {
      items[currentFocus].classList.add('focused');
      items[currentFocus].scrollIntoView({ block: 'nearest' });
    }
  }
}

/**
 * Helper to show inline search validation error
 */
function showValidationWarning(msg) {
  let box = document.getElementById('search-validation-banner');
  if (!box) {
    const form = document.getElementById('bus-search-form') || document.getElementById('modify-search-form');
    if (form) {
      box = document.createElement('div');
      box.id = 'search-validation-banner';
      box.className = 'search-validation-msg';
      form.parentNode.insertBefore(box, form);
    }
  }
  if (box) {
    box.innerHTML = `<span>⚠️</span> <span>${escapeHtml(msg)}</span>`;
    box.style.display = 'flex';
  }
}

function clearValidationWarning() {
  const box = document.getElementById('search-validation-banner');
  if (box) box.style.display = 'none';
}

/**
 * Initialize Polished Compact Custom Date Picker
 */
function setupCustomDatePicker(displayInputId, hiddenInputId, popupId) {
  const displayInput = document.getElementById(displayInputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const popup = document.getElementById(popupId);
  if (!displayInput || !hiddenInput || !popup) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentViewMonth = today.getMonth();
  let currentViewYear = today.getFullYear();
  let selectedDate = new Date();
  selectedDate.setHours(0, 0, 0, 0);

  function formatDateIso(d) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function formatDisplayDate(d) {
    return d.toLocaleDateString('en-IN', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  }

  // Set initial default value
  hiddenInput.value = formatDateIso(selectedDate);
  displayInput.value = formatDisplayDate(selectedDate);

  function renderCalendar() {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const firstDayIndex = new Date(currentViewYear, currentViewMonth, 1).getDay();
    const daysInMonth = new Date(currentViewYear, currentViewMonth + 1, 0).getDate();

    const isCurrentMonthOrFuture = 
      currentViewYear > today.getFullYear() || 
      (currentViewYear === today.getFullYear() && currentViewMonth >= today.getMonth());

    const isPrevDisabled = 
      currentViewYear === today.getFullYear() && currentViewMonth <= today.getMonth();

    popup.innerHTML = `
      <div class="cal-quick-picks">
        <button type="button" class="cal-quick-btn" id="btn-quick-today">📅 Today</button>
        <button type="button" class="cal-quick-btn" id="btn-quick-tomorrow">🌅 Tomorrow</button>
      </div>

      <div class="cal-header">
        <button type="button" class="cal-nav-btn" id="btn-cal-prev" ${isPrevDisabled ? 'disabled' : ''}>‹</button>
        <div class="cal-month-title">${monthNames[currentViewMonth]} ${currentViewYear}</div>
        <button type="button" class="cal-nav-btn" id="btn-cal-next">›</button>
      </div>

      <div class="cal-days-header">
        <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
      </div>

      <div class="cal-days-grid" id="cal-grid-cells"></div>
    `;

    const cellsContainer = popup.querySelector('#cal-grid-cells');

    // Empty spaces before first day
    for (let i = 0; i < firstDayIndex; i++) {
      const emptyCell = document.createElement('div');
      cellsContainer.appendChild(emptyCell);
    }

    // Days cells
    for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
      const cellDate = new Date(currentViewYear, currentViewMonth, dayNum);
      cellDate.setHours(0, 0, 0, 0);

      const cell = document.createElement('div');
      cell.className = 'cal-day-cell';
      cell.textContent = dayNum;

      const isPast = cellDate < today;
      const isToday = cellDate.getTime() === today.getTime();
      const isSelected = cellDate.getTime() === selectedDate.getTime();

      if (isPast) {
        cell.classList.add('disabled');
      } else {
        if (isToday) cell.classList.add('today');
        if (isSelected) cell.classList.add('selected');

        cell.addEventListener('click', () => {
          selectedDate = cellDate;
          hiddenInput.value = formatDateIso(selectedDate);
          displayInput.value = formatDisplayDate(selectedDate);
          popup.style.display = 'none';

          // Trigger change event on hidden input for search listeners
          hiddenInput.dispatchEvent(new Event('change'));
        });
      }

      cellsContainer.appendChild(cell);
    }

    // Quick pick handlers
    popup.querySelector('#btn-quick-today').addEventListener('click', (e) => {
      e.preventDefault();
      selectedDate = new Date();
      selectedDate.setHours(0, 0, 0, 0);
      currentViewMonth = selectedDate.getMonth();
      currentViewYear = selectedDate.getFullYear();
      hiddenInput.value = formatDateIso(selectedDate);
      displayInput.value = formatDisplayDate(selectedDate);
      popup.style.display = 'none';
      hiddenInput.dispatchEvent(new Event('change'));
    });

    popup.querySelector('#btn-quick-tomorrow').addEventListener('click', (e) => {
      e.preventDefault();
      selectedDate = new Date();
      selectedDate.setDate(selectedDate.getDate() + 1);
      selectedDate.setHours(0, 0, 0, 0);
      currentViewMonth = selectedDate.getMonth();
      currentViewYear = selectedDate.getFullYear();
      hiddenInput.value = formatDateIso(selectedDate);
      displayInput.value = formatDisplayDate(selectedDate);
      popup.style.display = 'none';
      hiddenInput.dispatchEvent(new Event('change'));
    });

    // Month Navigation
    popup.querySelector('#btn-cal-prev').addEventListener('click', (e) => {
      e.preventDefault();
      if (!isPrevDisabled) {
        currentViewMonth--;
        if (currentViewMonth < 0) {
          currentViewMonth = 11;
          currentViewYear--;
        }
        renderCalendar();
      }
    });

    popup.querySelector('#btn-cal-next').addEventListener('click', (e) => {
      e.preventDefault();
      currentViewMonth++;
      if (currentViewMonth > 11) {
        currentViewMonth = 0;
        currentViewYear++;
      }
      renderCalendar();
    });
  }

  // Open calendar on click
  displayInput.addEventListener('click', (e) => {
    e.stopPropagation();
    renderCalendar();
    popup.style.display = popup.style.display === 'block' ? 'none' : 'block';
  });

  // Close calendar when clicking outside
  document.addEventListener('click', (e) => {
    if (!popup.contains(e.target) && e.target !== displayInput) {
      popup.style.display = 'none';
    }
  });
}
