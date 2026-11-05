
# Nepali Date Picker

A lightweight JavaScript Nepali Bikram Sambat (BS) date picker with
automatic AD (Gregorian) date conversion.

## Features

- Nepali BS calendar popup
- AD to BS conversion
- BS to AD conversion
- Multiple input fields
- Custom date formats
- AD or BS output
- JavaScript callback support
- Custom date range
- Responsive design
- No external dependencies
- CDN support

## Installation

### Option 1: Local installation

Copy the dist folder into your project.

```html
<link rel="stylesheet" href="dist/nepali-date-picker.css">

<script src="dist/nepali-date-picker.js"></script>
```

### Option 2: CDN using jsDelivr

Replace YOUR_USERNAME with your GitHub username.

```html
<link rel="stylesheet"
 href="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/nepali-date-picker@v1.0.0/dist/nepali-date-picker.css">

<script src="https://cdn.jsdelivr.net/gh/YOUR_USERNAME/nepali-date-picker@v1.0.0/dist/nepali-date-picker.js"></script>
```

## Basic Usage

### Return AD date

```html
<input type="text" id="ADDATE" placeholder="Select Date">

<script>
NepaliDatePicker.init({
    selector: "#ADDATE",
    dateFormat: "yyyy-mm-dd",
    returnFormat: "AD"
});
</script>
```

### Return BS date

```html
<input type="text" id="BSDATE">

<script>
NepaliDatePicker.init({
    selector: "#BSDATE",
    dateFormat: "yyyy-mm-dd",
    returnFormat: "BS"
});
</script>
```

## Multiple Date Fields

```html
<input class="nepali-date" id="STARTDATE">
<input class="nepali-date" id="ENDDATE">

<script>
NepaliDatePicker.init({
    selector: ".nepali-date",
    returnFormat: "AD"
});
</script>
```

## Custom Date Format

Supported formats:

- yyyy-mm-dd
- dd-mm-yyyy
- yyyy/mm/dd
- dd/mm/yyyy

```javascript
NepaliDatePicker.init({
    selector: "#ADDATE",
    dateFormat: "dd/mm/yyyy",
    returnFormat: "AD"
});
```

## Open Calendar Programmatically

```javascript
NepaliDatePicker.open("#ADDATE");
```

## Close Calendar

```javascript
NepaliDatePicker.close();
```

## AD to BS Conversion

```javascript
const bsDate =
    NepaliDatePicker.ADToBS("2026-11-05");

console.log(bsDate);
```

## BS to AD Conversion

```javascript
const adDate =
    NepaliDatePicker.BSToAD("2083-07-19");

console.log(adDate);
```

## Selection Callback

```javascript
NepaliDatePicker.init({
    selector: "#ADDATE",
    returnFormat: "AD",

    onSelect: function(data) {

        console.log("AD Date:", data.adDate);

        console.log("BS Date:", data.bsDate);

        console.log("Textbox Value:", data.value);

    }
});
```

## Custom Event

```javascript
document.getElementById("ADDATE")
.addEventListener("nepali-date-selected", function(e) {

    console.log(e.detail.adDate);
    console.log(e.detail.bsDate);

});
```

## Date Restrictions

The minDate and maxDate options accept AD dates.

```javascript
NepaliDatePicker.init({
    selector: "#ADDATE",
    returnFormat: "AD",
    minDate: "2025-04-14",
    maxDate: "2026-12-16"
});
```

## Remove Date Picker

```javascript
NepaliDatePicker.destroy("#ADDATE");
```

## Calendar Data

The initial release includes the supplied
MDM_CALENDAR_MASTER records:

BS: 2081-10 through 2083-09

AD: 2025-01-14 through 2026-12-16

Dates outside the supplied calendar range return null.

For production use, update calendarData with additional
official Nepali calendar master records.

## Version

1.0.0

## License

MIT License
