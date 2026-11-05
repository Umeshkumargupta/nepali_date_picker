(function (global) {
    "use strict";

    const NDP = global.NepaliDatePicker;

    if (!NDP) {
        console.error("Load nepali-date-picker.js before nepali-date-range-picker.js");
        return;
    }

    const pad = n => String(n).padStart(2, "0");

    function dateUTC(iso) {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
        if (!m) return null;

        const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

        if (d.getUTCFullYear() !== +m[1] ||
            d.getUTCMonth() !== +m[2] - 1 ||
            d.getUTCDate() !== +m[3]) return null;

        return d;
    }

    function isoDate(d) {
        return d.getUTCFullYear() + "-" +
            pad(d.getUTCMonth() + 1) + "-" +
            pad(d.getUTCDate());
    }

    function addDays(iso, amount) {
        const d = dateUTC(iso);
        if (!d) return null;
        d.setUTCDate(d.getUTCDate() + amount);
        return isoDate(d);
    }

    function todayISO() {
        const d = new Date();
        return isoDate(new Date(Date.UTC(
            d.getFullYear(), d.getMonth(), d.getDate()
        )));
    }

    function format(iso, pattern) {
        const parts = iso.split("-");
        return pattern
            .replace(/yyyy/g, parts[0])
            .replace(/mm/g, parts[1])
            .replace(/dd/g, parts[2]);
    }

    function getMonthIndex(month) {
        return NDP.getCalendarData().findIndex(x => x[0] === month);
    }

    function monthStart(index) {
        const data = NDP.getCalendarData();
        return data[index] ? data[index][1] : null;
    }

    function monthEnd(index) {
        const data = NDP.getCalendarData();
        if (!data[index]) return null;

        if (data[index + 1]) {
            return addDays(data[index + 1][1], -1);
        }

        return addDays(data[index][1], data[index][2] - 1);
    }

    function getBSMonth(ad) {
        const bs = NDP.ADToBS(ad);
        return bs ? bs.substring(0, 7) : null;
    }

    function getFiscalYearIndex(ad) {
        const month = getBSMonth(ad);
        if (!month) return -1;

        const data = NDP.getCalendarData();
        const currentIndex = getMonthIndex(month);

        if (currentIndex < 0) return -1;

        const bsYear = Number(month.substring(0, 4));
        const newYearIndex = data.findIndex(
            x => x[0] === bsYear + "-01"
        );

        return newYearIndex;
    }

    function getPresetRanges() {
        const today = todayISO();
        const todayDate = dateUTC(today);
        const weekday = todayDate.getUTCDay();

        const thisWeekStart = addDays(today, -weekday);
        const lastWeekStart = addDays(thisWeekStart, -7);
        const lastWeekEnd = addDays(thisWeekStart, -1);

        const data = NDP.getCalendarData();
        const currentBSMonth = getBSMonth(today);
        const currentMonthIndex = currentBSMonth
            ? getMonthIndex(currentBSMonth) : -1;

        const fiscalIndex = getFiscalYearIndex(today);

        const ranges = [
            { name: "Today", start: today, end: today },
            { name: "Yesterday", start: addDays(today, -1), end: addDays(today, -1) },
            { name: "This Week", start: thisWeekStart, end: today },
            { name: "Last Week", start: lastWeekStart, end: lastWeekEnd }
        ];

        if (currentMonthIndex >= 0) {
            ranges.push({
                name: "This Month",
                start: monthStart(currentMonthIndex),
                end: today
            });

            if (currentMonthIndex > 0) {
                ranges.push({
                    name: "Last Month",
                    start: monthStart(currentMonthIndex - 1),
                    end: monthEnd(currentMonthIndex - 1)
                });
            }
        }

        if (fiscalIndex >= 0) {
            const quarterDefinitions = [
                ["First Quarter", 0],
                ["Second Quarter", 3],
                ["Third Quarter", 6],
                ["Fourth Quarter", 9]
            ];

            quarterDefinitions.forEach(([name, offset]) => {
                const startIndex = fiscalIndex + offset;
                const endIndex = startIndex + 2;

                if (data[startIndex] && data[endIndex]) {
                    ranges.push({
                        name,
                        start: monthStart(startIndex),
                        end: monthEnd(endIndex)
                    });
                }
            });

            const nextFiscalStart = data[fiscalIndex + 12];

            if (data[fiscalIndex] && nextFiscalStart) {
                ranges.push({
                    name: "This Year",
                    start: monthStart(fiscalIndex),
                    end: addDays(nextFiscalStart[1], -1)
                });
            }
        }

        return ranges.filter(x => x.start && x.end);
    }

    const MONTHS = [
        "बैशाख", "जेठ", "असार", "साउन",
        "भदौ", "असोज", "कार्तिक", "मंसिर",
        "पुष", "माघ", "फागुन", "चैत"
    ];

    const WEEKDAYS = ["आइत", "सोम", "मंगल", "बुध", "बिही", "शुक्र", "शनि"];

    let config = null;
    let modal = null;
    let monthIndex = 0;
    let startDate = null;
    let endDate = null;
    let selectingEnd = false;
    let activePreset = "";
    let currentInput = null;

    function createModal() {
        if (modal) return;

        modal = document.createElement("div");
        modal.className = "ndrp-overlay";

        modal.innerHTML = `
            <div class="ndrp-modal" role="dialog" aria-modal="true">
                <div class="ndrp-header">
                    <div>
                        <strong>Date Range Selection</strong>
                        <small class="ndrp-summary">Select a date range</small>
                    </div>
                    <button type="button" class="ndrp-close">×</button>
                </div>

                <div class="ndrp-body">
                    <aside class="ndrp-presets">
                        <div class="ndrp-preset-title">Date Periods</div>
                        <div class="ndrp-preset-list"></div>
                    </aside>

                    <section class="ndrp-calendar-section">
                        <div class="ndrp-fields">
                            <label>
                                From Date
                                <input class="ndrp-from" type="text" readonly>
                            </label>
                            <label>
                                To Date
                                <input class="ndrp-to" type="text" readonly>
                            </label>
                        </div>

                        <div class="ndrp-navigation">
                            <button type="button" class="ndrp-prev">‹</button>
                            <strong class="ndrp-month-title"></strong>
                            <button type="button" class="ndrp-next">›</button>
                        </div>

                        <div class="ndrp-calendar"></div>

                        <div class="ndrp-footer">
                            <span class="ndrp-hint">Select From Date, then To Date</span>
                            <div>
                                <button type="button" class="ndrp-cancel">Cancel</button>
                                <button type="button" class="ndrp-apply">Apply Range</button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        modal.querySelector(".ndrp-close").onclick = close;
        modal.querySelector(".ndrp-cancel").onclick = close;

        modal.addEventListener("click", e => {
            if (e.target === modal) close();
        });

        modal.querySelector(".ndrp-prev").onclick = () => {
            if (monthIndex > 0) {
                monthIndex--;
                renderCalendar();
            }
        };

        modal.querySelector(".ndrp-next").onclick = () => {
            if (monthIndex < NDP.getCalendarData().length - 1) {
                monthIndex++;
                renderCalendar();
            }
        };

        modal.querySelector(".ndrp-calendar").addEventListener("click", e => {
            const button = e.target.closest("[data-ad]");
            if (!button || button.disabled) return;
            chooseDate(button.dataset.ad);
        });

        modal.querySelector(".ndrp-preset-list").addEventListener("click", e => {
            const button = e.target.closest("[data-preset]");
            if (!button) return;
            selectPreset(button.dataset.preset);
        });

        modal.querySelector(".ndrp-apply").onclick = applyRange;

        document.addEventListener("keydown", e => {
            if (e.key === "Escape" && modal.classList.contains("ndrp-visible")) {
                close();
            }
        });
    }

    function open() {
        createModal();

        const data = NDP.getCalendarData();
        const today = todayISO();
        const bs = NDP.ADToBS(today);

        if (!bs) {
            alert("Today's date is outside the available Nepali calendar data.");
            return;
        }

        monthIndex = getMonthIndex(bs.substring(0, 7));
        startDate = null;
        endDate = null;
        selectingEnd = false;
        activePreset = "";

        renderPresets();
        renderCalendar();
        updateFields();

        modal.classList.add("ndrp-visible");
    }

    function close() {
        if (modal) modal.classList.remove("ndrp-visible");
    }

    function renderPresets() {
        const list = modal.querySelector(".ndrp-preset-list");
        const ranges = getPresetRanges();

        list.innerHTML = ranges.map(range => `
            <button type="button"
                class="ndrp-preset ${activePreset === range.name ? "active" : ""}"
                data-preset="${range.name}">
                ${range.name}
            </button>
        `).join("");
    }

    function selectPreset(name) {
        const range = getPresetRanges().find(x => x.name === name);
        if (!range) return;

        startDate = range.start;
        endDate = range.end;
        selectingEnd = false;
        activePreset = name;

        const bs = NDP.ADToBS(startDate);
        if (bs) monthIndex = getMonthIndex(bs.substring(0, 7));

        renderPresets();
        renderCalendar();
        updateFields();
    }

    function chooseDate(ad) {
        if (!startDate || (startDate && endDate)) {
            startDate = ad;
            endDate = null;
            selectingEnd = true;
            activePreset = "";
        } else {
            if (ad < startDate) {
                endDate = startDate;
                startDate = ad;
            } else {
                endDate = ad;
            }
            selectingEnd = false;
        }

        renderPresets();
        renderCalendar();
        updateFields();
    }

    function renderCalendar() {
        const data = NDP.getCalendarData();
        const record = data[monthIndex];
        if (!record) return;

        const monthNumber = Number(record[0].substring(5, 7));
        const year = record[0].substring(0, 4);
        const firstDate = dateUTC(record[1]);
        const firstDay = firstDate.getUTCDay();

        modal.querySelector(".ndrp-month-title").textContent =
            MONTHS[monthNumber - 1] + " " + year;

        modal.querySelector(".ndrp-prev").disabled = monthIndex === 0;
        modal.querySelector(".ndrp-next").disabled = monthIndex === data.length - 1;

        let html = '<div class="ndrp-grid">';

        WEEKDAYS.forEach((day, i) => {
            html += `<div class="ndrp-weekday">${day}</div>`;
        });

        for (let i = 0; i < firstDay; i++) {
            html += '<div class="ndrp-empty"></div>';
        }

        for (let day = 1; day <= record[2]; day++) {
            const ad = addDays(record[1], day - 1);
            const bs = record[0] + "-" + pad(day);

            const inRange = startDate && endDate &&
                ad >= startDate && ad <= endDate;

            const selected = ad === startDate || ad === endDate;

            html += `
                <button type="button"
                    class="ndrp-day ${inRange ? "in-range" : ""} ${selected ? "selected" : ""}"
                    data-ad="${ad}">
                    <span>${day}</span>
                    <small>${ad.substring(8, 10)}/${ad.substring(5, 7)}</small>
                </button>
            `;
        }

        html += "</div>";
        modal.querySelector(".ndrp-calendar").innerHTML = html;
    }

    function updateFields() {
        const from = modal.querySelector(".ndrp-from");
        const to = modal.querySelector(".ndrp-to");

        const outputFormat = config.returnFormat;
        const dateFormat = config.dateFormat;

        function output(ad) {
            if (!ad) return "";
            const value = outputFormat === "BS" ? NDP.ADToBS(ad) : ad;
            return value ? format(value, dateFormat) : "";
        }

        from.value = output(startDate);
        to.value = output(endDate);

        modal.querySelector(".ndrp-summary").textContent =
            startDate && endDate
                ? startDate + "  →  " + endDate
                : startDate
                    ? "Select To Date"
                    : "Select a date range";

        modal.querySelector(".ndrp-hint").textContent =
            selectingEnd ? "Now select To Date" : "Select From Date, then To Date";
    }

    function applyRange() {
        if (!startDate || !endDate) {
            alert("Please select both From Date and To Date.");
            return;
        }

        const startBS = NDP.ADToBS(startDate);
        const endBS = NDP.ADToBS(endDate);

        if (!startBS || !endBS) {
            alert("BS conversion is unavailable. Please update the calendar master data.");
            return;
        }

        const startValue = config.returnFormat === "BS" ? startBS : startDate;
        const endValue = config.returnFormat === "BS" ? endBS : endDate;

        const fromElement = document.querySelector(config.startSelector);
        const toElement = document.querySelector(config.endSelector);

        if (!fromElement || !toElement) {
            console.error("Date range input elements not found.");
            return;
        }

        fromElement.value = format(startValue, config.dateFormat);
        toElement.value = format(endValue, config.dateFormat);

        [fromElement, toElement].forEach((element, index) => {
            element.dispatchEvent(new Event("input", { bubbles: true }));
            element.dispatchEvent(new Event("change", { bubbles: true }));

            element.dispatchEvent(new CustomEvent("nepali-date-selected", {
                bubbles: true,
                detail: {
                    adDate: index === 0 ? startDate : endDate,
                    bsDate: index === 0 ? startBS : endBS
                }
            }));
        });

        const result = {
            startAD: startDate,
            endAD: endDate,
            startBS: startBS,
            endBS: endBS,
            period: activePreset || "Custom",
            startValue: fromElement.value,
            endValue: toElement.value
        };

        if (typeof config.onSelect === "function") {
            config.onSelect(result);
        }

        close();
    }

    function initRange(options) {
        config = Object.assign({
            startSelector: "",
            endSelector: "",
            dateFormat: "yyyy-mm-dd",
            returnFormat: "AD",
            onSelect: null
        }, options || {});

        if (!config.startSelector || !config.endSelector) {
            console.error("startSelector and endSelector are required.");
            return;
        }

        [config.startSelector, config.endSelector].forEach(selector => {
            document.querySelectorAll(selector).forEach(input => {
                input.readOnly = true;
                input.classList.add("ndp-input");

                input.addEventListener("click", open);
            });
        });
    }

    NDP.initRange = initRange;
    NDP.openRange = open;
    NDP.closeRange = close;

})(window);