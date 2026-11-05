
(function (global) {
    "use strict";

    const NepaliDatePicker = {};

    // ==========================================
    // 1. NEPALI CALENDAR MASTER DATA
    // Format: [BS Month, AD Start Date, Days]
    // ==========================================

    const calendarData = [
        ["2081-10", "2025-01-14", 30],
        ["2081-11", "2025-02-13", 29],
        ["2081-12", "2025-03-14", 31],
        ["2082-01", "2025-04-14", 31],
        ["2082-02", "2025-05-15", 31],
        ["2082-03", "2025-06-15", 32],
        ["2082-04", "2025-07-17", 31],
        ["2082-05", "2025-08-17", 31],
        ["2082-06", "2025-09-17", 31],
        ["2082-07", "2025-10-18", 30],
        ["2082-08", "2025-11-17", 29],
        ["2082-09", "2025-12-16", 30],
        ["2082-10", "2026-01-15", 29],
        ["2082-11", "2026-02-13", 30],
        ["2082-12", "2026-03-15", 30],
        ["2083-01", "2026-04-14", 31],
        ["2083-02", "2026-05-15", 31],
        ["2083-03", "2026-06-15", 32],
        ["2083-04", "2026-07-17", 31],
        ["2083-05", "2026-08-17", 31],
        ["2083-06", "2026-09-17", 31],
        ["2083-07", "2026-10-18", 30],
        ["2083-08", "2026-11-17", 29],
        ["2083-09", "2026-12-16", 30]
    ];

    const BS_MONTHS = [
        "बैशाख", "जेठ", "असार", "साउन",
        "भदौ", "असोज", "कार्तिक", "मंसिर",
        "पुष", "माघ", "फागुन", "चैत"
    ];

    const WEEKDAYS = [
        "आइत", "सोम", "मंगल", "बुध",
        "बिही", "शुक्र", "शनि"
    ];

    const pad = n => String(n).padStart(2, "0");

    function parseDate(value) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");

        if (!match) return null;

        const y = Number(match[1]);
        const m = Number(match[2]);
        const d = Number(match[3]);

        const date = new Date(Date.UTC(y, m - 1, d));

        if (
            date.getUTCFullYear() !== y ||
            date.getUTCMonth() !== m - 1 ||
            date.getUTCDate() !== d
        ) return null;

        return date;
    }

    function toISO(date) {
        return date.getUTCFullYear() + "-" +
            pad(date.getUTCMonth() + 1) + "-" +
            pad(date.getUTCDate());
    }

    function addDays(dateString, days) {
        const date = parseDate(dateString);
        if (!date) return null;

        date.setUTCDate(date.getUTCDate() + days);
        return toISO(date);
    }

    function getMonthIndex(month) {
        return calendarData.findIndex(item => item[0] === month);
    }

    // ==========================================
    // 2. AD TO BS CONVERSION
    // ==========================================

    function ADToBS(adDate) {
        const date = parseDate(adDate);

        if (!date) return null;

        let index = -1;

        for (let i = 0; i < calendarData.length; i++) {
            if (calendarData[i][1] <= adDate) {
                index = i;
            } else {
                break;
            }
        }

        if (index < 0) return null;

        const record = calendarData[index];

        const difference = Math.round(
            (date - parseDate(record[1])) / 86400000
        );

        const day = difference + 1;

        if (day < 1 || day > record[2]) return null;

        return record[0] + "-" + pad(day);
    }

    // ==========================================
    // 3. BS TO AD CONVERSION
    // ==========================================

    function BSToAD(bsDate) {
        const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(bsDate || "");

        if (!match) return null;

        const month = match[1] + "-" + match[2];
        const day = Number(match[3]);

        const index = getMonthIndex(month);

        if (index < 0) return null;

        const record = calendarData[index];

        if (day < 1 || day > record[2]) return null;

        return addDays(record[1], day - 1);
    }

    // ==========================================
    // 4. DATE FORMATTING
    // ==========================================

    function formatDate(date, format) {
        const [year, month, day] = date.split("-");

        return format
            .replace(/yyyy/g, year)
            .replace(/mm/g, month)
            .replace(/dd/g, day);
    }

    function parseFormattedDate(value, format) {
        if (!value) return null;

        const tokens = format.match(/yyyy|mm|dd/g);

        if (!tokens || tokens.length !== 3) return null;

        const escaped = format.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        let pattern = escaped;

        ["yyyy", "mm", "dd"].forEach(token => {
            pattern = pattern.replace(token, "(\\d{" +
                (token === "yyyy" ? "4" : "2") + "})");
        });

        const match = new RegExp("^" + pattern + "$").exec(value);

        if (!match) return null;

        const values = {};

        tokens.forEach((token, index) => {
            values[token] = match[index + 1];
        });

        return values.yyyy + "-" + values.mm + "-" + values.dd;
    }

    // ==========================================
    // 5. PICKER UI
    // ==========================================

    let activeInput = null;
    let activeOptions = null;
    let activeMonthIndex = 0;
    let pickerElement = null;
    let initialized = [];

    const defaults = {
        selector: "",
        dateFormat: "yyyy-mm-dd",
        returnFormat: "AD",
        calendarType: "BS",
        readonly: true,
        autoClose: true,
        minDate: null,
        maxDate: null,
        onSelect: null
    };

    function createPicker() {
        if (pickerElement) return;

        pickerElement = document.createElement("div");
        pickerElement.className = "ndp-overlay";
        pickerElement.innerHTML = `
            <div class="ndp-popup" role="dialog"
                 aria-modal="true"
                 aria-label="Nepali date picker">

                <div class="ndp-header">
                    <div>
                        <strong>Nepali Date Picker</strong>
                        <small class="ndp-ad-info"></small>
                    </div>
                    <button type="button" class="ndp-close"
                        aria-label="Close">×</button>
                </div>

                <div class="ndp-navigation">
                    <button type="button" class="ndp-prev">‹</button>
                    <strong class="ndp-month-title"></strong>
                    <button type="button" class="ndp-next">›</button>
                </div>

                <div class="ndp-calendar"></div>

                <div class="ndp-footer">
                    <span class="ndp-selected-info"></span>
                    <button type="button" class="ndp-today">Today</button>
                </div>
            </div>
        `;

        document.body.appendChild(pickerElement);

        pickerElement.querySelector(".ndp-close")
            .addEventListener("click", close);

        pickerElement.addEventListener("click", function (event) {
            if (event.target === pickerElement) close();
        });

        pickerElement.querySelector(".ndp-prev")
            .addEventListener("click", function () {
                if (activeMonthIndex > 0) {
                    activeMonthIndex--;
                    renderCalendar();
                }
            });

        pickerElement.querySelector(".ndp-next")
            .addEventListener("click", function () {
                if (activeMonthIndex < calendarData.length - 1) {
                    activeMonthIndex++;
                    renderCalendar();
                }
            });

        pickerElement.querySelector(".ndp-today")
            .addEventListener("click", function () {
                const today = toISO(new Date(
                    Date.UTC(
                        new Date().getFullYear(),
                        new Date().getMonth(),
                        new Date().getDate()
                    )
                ));

                const bs = ADToBS(today);

                if (bs) selectDate(today);
            });

        pickerElement.querySelector(".ndp-calendar")
            .addEventListener("click", function (event) {
                const button = event.target.closest("[data-ad]");

                if (!button || !button.dataset.ad) return;

                selectDate(button.dataset.ad);
            });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape" && pickerElement &&
                pickerElement.classList.contains("ndp-visible")) {
                close();
            }
        });
    }

    // ==========================================
    // 6. RENDER CALENDAR
    // ==========================================

    function renderCalendar() {
        const record = calendarData[activeMonthIndex];

        if (!record) return;

        const [year, month] = record[0].split("-").map(Number);

        const startDate = parseDate(record[1]);
        const firstDay = startDate.getUTCDay();

        const calendar = pickerElement.querySelector(".ndp-calendar");

        pickerElement.querySelector(".ndp-month-title").textContent =
            BS_MONTHS[month - 1] + " " + year;

        pickerElement.querySelector(".ndp-ad-info").textContent =
            "AD: " + record[1];

        const previous = pickerElement.querySelector(".ndp-prev");
        const next = pickerElement.querySelector(".ndp-next");

        previous.disabled = activeMonthIndex === 0;
        next.disabled = activeMonthIndex === calendarData.length - 1;

        let html = '<div class="ndp-grid">';

        WEEKDAYS.forEach((day, index) => {
            html += `<div class="ndp-weekday ${index === 0 ? "ndp-sunday" : ""}">
                ${day}
            </div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="ndp-empty"></div>';
        }

        for (let day = 1; day <= record[2]; day++) {
            const ad = addDays(record[1], day - 1);
            const bs = record[0] + "-" + pad(day);

            const isSelected = getCurrentAD() === ad;
            const isDisabled =
                (activeOptions.minDate && ad < activeOptions.minDate) ||
                (activeOptions.maxDate && ad > activeOptions.maxDate);

            html += `
                <button type="button"
                    class="ndp-day ${isSelected ? "ndp-selected" : ""}"
                    data-ad="${ad}"
                    data-bs="${bs}"
                    ${isDisabled ? "disabled" : ""}>
                    <span>${day}</span>
                    <small>${ad.slice(8, 10)}/${ad.slice(5, 7)}</small>
                </button>`;
        }

        html += "</div>";

        calendar.innerHTML = html;

        const selectedBS = ADToBS(getCurrentAD());

        pickerElement.querySelector(".ndp-selected-info").textContent =
            selectedBS ? "Selected: " + selectedBS : "Select a date";
    }

    function getCurrentAD() {
        if (!activeInput) return null;

        const value = activeInput.value.trim();

        if (!value) return null;

        const format = activeOptions.dateFormat;

        if (activeOptions.returnFormat === "BS") {
            const bs = parseFormattedDate(value, format);
            return bs ? BSToAD(bs) : null;
        }

        return parseFormattedDate(value, format);
    }

    // ==========================================
    // 7. SELECT DATE
    // ==========================================

    function selectDate(adDate) {
        if (!activeInput || !activeOptions) return;

        const bsDate = ADToBS(adDate);

        if (!bsDate) return;

        const output = activeOptions.returnFormat === "BS"
            ? bsDate
            : adDate;

        activeInput.value = formatDate(
            output,
            activeOptions.dateFormat
        );

        activeInput.dispatchEvent(
            new Event("input", { bubbles: true })
        );

        activeInput.dispatchEvent(
            new Event("change", { bubbles: true })
        );

        activeInput.dispatchEvent(
            new CustomEvent("nepali-date-selected", {
                bubbles: true,
                detail: {
                    adDate: adDate,
                    bsDate: bsDate
                }
            })
        );

        if (typeof activeOptions.onSelect === "function") {
            activeOptions.onSelect({
                adDate: adDate,
                bsDate: bsDate,
                value: output
            });
        }

        renderCalendar();

        if (activeOptions.autoClose) close();
    }

    // ==========================================
    // 8. OPEN / CLOSE
    // ==========================================

    function open(target) {
        if (typeof target === "string") {
            target = document.querySelector(target);
        }

        if (target) {
            activeInput = target;
        }

        if (!activeInput) {
            console.warn("NepaliDatePicker: No input selected.");
            return;
        }

        const config = initialized.find(item =>
            item.element === activeInput
        );

        activeOptions = config
            ? config.options
            : Object.assign({}, defaults);

        createPicker();

        const currentAD = getCurrentAD();
        const currentBS = currentAD ? ADToBS(currentAD) : null;

        const defaultBS = currentBS ||
            ADToBS(toISO(new Date(Date.UTC(
                new Date().getFullYear(),
                new Date().getMonth(),
                new Date().getDate()
            ))));

        activeMonthIndex = defaultBS
            ? getMonthIndex(defaultBS.slice(0, 7))
            : 0;

        if (activeMonthIndex < 0) activeMonthIndex = 0;

        renderCalendar();

        pickerElement.classList.add("ndp-visible");
    }

    function close() {
        if (pickerElement) {
            pickerElement.classList.remove("ndp-visible");
        }
    }

    // ==========================================
    // 9. INITIALIZE INPUT FIELDS
    // ==========================================

    function init(options) {
        options = Object.assign({}, defaults, options || {});

        if (!options.selector) {
            console.error("NepaliDatePicker: selector is required.");
            return;
        }

        const elements = document.querySelectorAll(options.selector);

        elements.forEach(element => {
            if (initialized.some(item => item.element === element)) {
                return;
            }

            const elementOptions = Object.assign({}, options);

            initialized.push({
                element: element,
                options: elementOptions
            });

            if (elementOptions.readonly) {
                element.readOnly = true;
            }

            element.classList.add("ndp-input");

            element.addEventListener("click", function () {
                open(element);
            });

            element.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open(element);
                }
            });
        });
    }

    // ==========================================
    // 10. DESTROY
    // ==========================================

    function destroy(selector) {
        const elements = document.querySelectorAll(selector);

        elements.forEach(element => {
            initialized = initialized.filter(item =>
                item.element !== element
            );

            element.classList.remove("ndp-input");
            element.readOnly = false;
        });
    }

    // ==========================================
    // 11. PUBLIC API
    // ==========================================

    NepaliDatePicker.init = init;
    NepaliDatePicker.open = open;
    NepaliDatePicker.close = close;
    NepaliDatePicker.destroy = destroy;

    NepaliDatePicker.ADToBS = ADToBS;
    NepaliDatePicker.BSToAD = BSToAD;

    NepaliDatePicker.getCalendarData = function () {
        return calendarData.map(item => item.slice());
    };

    global.NepaliDatePicker = NepaliDatePicker;

})(window);
