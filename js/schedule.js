
function toIndex(day) {
  if (day === "MON") return 1;
  if (day === "TUE") return 2;
  if (day === "WED") return 3;
  if (day === "THU") return 4;
  if (day === "FRI") return 5;
  if (day === "SAT") return 6;
  return 0;
}


// Function to generate CSV content from the timetable data
function generateCSV(headerData, childrenData) {
  let csvContent = "Day," + headerData.join(",") + "\n";
  childrenData.forEach(({ day, theory, lab }) => {
  theory.splice(0,1);
  lab.splice(0,1);
    const row = [day, ...theory.map((t, idx) => `${t} / ${(lab[idx] || "")}`)]; // Combine theory and lab data
    csvContent += row.join(",") + "\n";
  });
  return csvContent;
}

// Function to create an event name from the schedule data
function createEventName(event, rename = false) {
  let match = event.match(/([A-Z]+\d{4})/); // Match course code (e.g., CSE1002)
  if (match) match = match[1];
  if (rename && match) match = newNames[match[1]]; // Use match[1] as key
  let venueMatch;
  if (event.includes("ONL-ALL")) {
    venueMatch = "Online";
  } else {
    venueMatch = event.match(/(?:TH|LA)-(.*?)-ALL/); // Match venue
  }

  if (match && venueMatch) {
    if (typeof venueMatch === "string") {
      return `${match} ${venueMatch}`; // If venueMatch is "Online"
    } else if (venueMatch[1]) {
      return `${match} ${venueMatch[1]}`; // If venueMatch is a match object
    }
  }
  return null; // Return null if no valid name is found
}

// Function to generate ICS data from CSV data for calendar integration
function generateICSFromCSV(csvData, rename = false) {
  const daysToOffsets = { MON: 0, TUE: 1, WED: 2, THU: 3, FRI: 4, SAT: 5, SUN: 6 };
  const today = new Date();
  const previousMonday = new Date(today.setDate(today.getDate() - ((today.getDay() + 6) % 7))); // Get the previous Monday's date
  const lines = csvData.trim().split("\n");
  const header = lines[0].split(",").slice(1); // Extract the header
  const schedule = lines.slice(1).map((line) => line.split(",")); // Extract the schedule data

  let calendarContent = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
NAME:Classes
X-WR-CALNAME:Classes`;

  schedule.forEach((row) => {
    const day = row[0].trim().toUpperCase(); // Get the day from each row
    const offset = daysToOffsets[day];
    if (offset === undefined) return;

    const eventDate = new Date(previousMonday);
    eventDate.setDate(previousMonday.getDate() + offset);

    let previousEvent = null;
    let previousStartTime = null;
    let previousEndTime = null;

    row.slice(1).forEach((event, index) => {
      if (!event || event.trim() === "-" || event.trim().length < 8) return;
      if(header[index]==="Lunch - Lunch") return;
      //console.log(header[index]);
      
      const timeRange = header[index].split("-").map((t) => t.trim()); // Extract start and end times
      if (!timeRange || timeRange.length !== 2) return;

      const [startTime, endTime] = timeRange;
      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);
      
      if (isNaN(startHour) || isNaN(startMinute) || isNaN(endHour) || isNaN(endMinute)) {
        console.error("Invalid time values:", { startHour, startMinute, endHour, endMinute });
        return;
      }
      
      const startDateTime = new Date(eventDate);
      startDateTime.setHours(startHour, startMinute, 0, 0);

      const endDateTime = new Date(eventDate);
      endDateTime.setHours(endHour, endMinute, 0, 0);

      const eventName = createEventName(event.trim(), rename);
      if (!eventName) return;

      if (previousEvent === eventName) {
        previousEndTime = endDateTime;
      } else {
        if (previousEvent) {
          calendarContent += `
BEGIN:VEVENT
DTSTART:${formatDateTime(previousStartTime)}
DTEND:${formatDateTime(previousEndTime)}
SUMMARY:${previousEvent}
DESCRIPTION:Scheduled Event
RRULE:FREQ=WEEKLY;INTERVAL=1
BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT`;
        }

        previousEvent = eventName;
        previousStartTime = startDateTime;
        previousEndTime = endDateTime;
      }
    });

    if (previousEvent) {
      calendarContent += `
BEGIN:VEVENT
DTSTART:${formatDateTime(previousStartTime)}
DTEND:${formatDateTime(previousEndTime)}
SUMMARY:${previousEvent}
DESCRIPTION:Scheduled Event
RRULE:FREQ=WEEKLY;INTERVAL=1
BEGIN:VALARM
TRIGGER:-PT10M
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT`;
    }
  });

  calendarContent += `
END:VCALENDAR`;
  return calendarContent;
}


// Function to format the date and time into the correct ISO format for ICS
function formatDateTime(date) {
     if (!(date instanceof Date) || isNaN(date)) {
       console.error("Invalid date:", date);
       return null; // or handle the error appropriately
     }
     return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
   }
